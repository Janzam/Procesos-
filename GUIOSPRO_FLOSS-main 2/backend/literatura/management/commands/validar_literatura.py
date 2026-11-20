import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from literatura import calculo, clasificador, pipeline
from literatura.datos import prompts
from literatura.models import Corrida


class Command(BaseCommand):
    help = "Valida la reproducción de la Tabla 5.3 o ejecuta una corrida nueva de literatura"

    def add_arguments(self, parser):
        parser.add_argument("--anio-inicio", type=int, default=2008)
        parser.add_argument("--anio-fin", type=int, default=2019)
        parser.add_argument("--fuentes", default="openalex")
        parser.add_argument("--metodo-tc", choices=["unicos", "menciones"], default=None)
        parser.add_argument("--nombre", default=None)
        parser.add_argument("--conteos", type=str, default=None,
                            help="JSON con {id_o_nombre: TC} para validar solo el cálculo, sin red")
        parser.add_argument("--modo-demo", action="store_true",
                            help="Usa el clasificador determinista de demostración (no válido para la tesis)")
        parser.add_argument("--proveedor", choices=["anthropic", "groq", "demo"], default=None,
                            help="Sobrescribe LIT_PROVEEDOR_IA para esta corrida")
        parser.add_argument("--modelo", default=None,
                            help="Sobrescribe LIT_MODELO para esta corrida")
        parser.add_argument("--max-paginas", type=int, default=None)
        parser.add_argument("--max-articulos", type=int, default=0)

    def handle(self, *args, **opts):
        if opts["proveedor"]:
            settings.LIT_PROVEEDOR_IA = opts["proveedor"]
            settings.LIT_CLASIFICADOR = opts["proveedor"]
        if opts["modelo"]:
            settings.LIT_MODELO = opts["modelo"]
        elif opts["proveedor"]:
            settings.LIT_MODELO = clasificador.MODELOS_POR_DEFECTO[opts["proveedor"]]
        if opts["modo_demo"]:
            settings.LIT_PROVEEDOR_IA = "demo"
            settings.LIT_CLASIFICADOR = "demo"
            settings.LIT_MODELO = clasificador.MODELOS_POR_DEFECTO["demo"]
            self.stdout.write(self.style.WARNING("Modo demo: los resultados NO son válidos para la tesis"))
        if opts["max_paginas"] is not None:
            settings.LIT_MAX_PAGINAS = opts["max_paginas"]

        if opts["conteos"]:
            datos = json.loads(Path(opts["conteos"]).read_text(encoding="utf-8"))
            calculado = calculo.calcular(datos)
            filas = calculado["factores"]
            cortes = calculado["cortes"]
            metricas = calculo.comparar(filas)
            titulo = f"Cálculo offline desde {opts['conteos']}"
        else:
            metodo = opts["metodo_tc"] or getattr(settings, "LIT_METODO_TC", "menciones")
            corrida = Corrida.objects.create(
                nombre=opts["nombre"] or f"Validación {opts['anio_inicio']}-{opts['anio_fin']}",
                anio_inicio=opts["anio_inicio"],
                anio_fin=opts["anio_fin"],
                fuentes=[f.strip() for f in opts["fuentes"].split(",") if f.strip()],
                metodo_tc=metodo,
                max_articulos=opts["max_articulos"],
                modelo_ia=clasificador.modelo_activo(),
                version_prompt=prompts.version_activa(clasificador.proveedor()),
            )
            corrida = pipeline.ejecutar(corrida)
            filas = [
                {
                    "nombre": r.factor.nombre, "ns": r.ns, "tc": r.tc, "r": r.r,
                    "il": r.il, "il_tesis": r.il_tesis, "is": r.is_calculada, "is_tesis": r.is_tesis,
                }
                for r in corrida.resultados.select_related("factor")
            ]
            cortes = corrida.cortes
            metricas = corrida.metricas
            titulo = f"Corrida #{corrida.id} — {corrida.rango} [{corrida.estado}]"

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING(titulo))
        self.stdout.write(f"Fórmula 5.1: r = TC / NS | Cuartiles: {[round(c, 4) for c in cortes]}")
        self.stdout.write("")
        if opts["conteos"] is None and corrida.estado != "listo":
            self.stdout.write(self.style.ERROR(f"Error: {corrida.mensaje}"))
            for evento in corrida.eventos.order_by("id"):
                self.stdout.write(f"  [{evento.fase}] {evento.mensaje}")
            return
        self.stdout.write(f"{'Factor':<52} {'NS':>3} {'TC':>5} {'r':>7} {'IL':>3} {'IL*':>4} {'IS':>3} {'IS*':>4}")
        self.stdout.write("-" * 90)
        for fila in filas:
            nombre = fila["nombre"][:50]
            self.stdout.write(
                f"{nombre:<52} {fila['ns']:>3} {fila['tc']:>5} {fila['r']:>7.3f} "
                f"{fila['il']:>3} {fila['il_tesis']:>4} {fila['is']:>3} {fila['is_tesis']:>4}"
            )
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"CAPA ESTRICTA — IL exactos: {metricas['il_exactos']}/{metricas['total']} | "
            f"IL a ±1: {metricas['il_dentro_de_1']}/{metricas['total']} | "
            f"IS iguales: {metricas['is_iguales']}/{metricas['total']} | "
            f"Spearman: {metricas['spearman']}"
        ))

        extendido = metricas.get("extendido") or {}
        filas_ext = extendido.get("factores") or []
        if filas_ext:
            self.stdout.write("")
            self.stdout.write(self.style.MIGRATE_HEADING("Capa extendida (exploratoria, no oficial)"))
            self.stdout.write(f"Cuartiles extendidos: {extendido.get('cortes')}")
            self.stdout.write("")
            self.stdout.write(f"{'Factor':<52} {'NS':>3} {'TC':>5} {'r':>7} {'IL':>3} {'IL*':>4} {'IS':>3} {'IS*':>4}")
            self.stdout.write("-" * 90)
            for fila in filas_ext:
                nombre = fila["nombre"][:50]
                self.stdout.write(
                    f"{nombre:<52} {fila['ns']:>3} {fila['tc']:>5} {fila['r']:>7.3f} "
                    f"{fila['il']:>3} {fila['il_tesis']:>4} {fila['is']:>3} {fila['is_tesis']:>4}"
                )
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(
                f"CAPA EXTENDIDA — IL exactos: {extendido['il_exactos']}/{extendido['total']} | "
                f"IL a ±1: {extendido['il_dentro_de_1']}/{extendido['total']} | "
                f"IS iguales: {extendido['is_iguales']}/{extendido['total']} | "
                f"Spearman: {extendido['spearman']}"
            ))
