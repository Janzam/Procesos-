import hashlib
import json
import threading
from collections import Counter, defaultdict
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from factores.models import Factor

from . import calculo, clasificador, fuentes
from .datos.prompts import huella_config, version_activa
from .datos.tabla_5_3 import TABLA_5_3
from .models import Articulo, Corrida, EventoProgreso, ResultadoFactor


def emitir(corrida, fase, mensaje, datos=None, nivel="info", actualizar=True):
    EventoProgreso.objects.create(
        corrida=corrida, fase=fase, mensaje=mensaje, datos=datos or {}, nivel=nivel
    )
    if not actualizar:
        return
    corrida.fase = fase
    corrida.mensaje = mensaje
    corrida.save(update_fields=["fase", "mensaje"])


def progreso(corrida, valor, fase=None):
    corrida.progreso = max(0, min(100, int(valor)))
    if fase:
        corrida.fase = fase
    corrida.save(update_fields=["progreso", "fase"])


def config_hash(corrida):
    return huella_config({
        "anio_inicio": corrida.anio_inicio,
        "anio_fin": corrida.anio_fin,
        "fuentes": sorted(corrida.fuentes),
        "metodo_tc": corrida.metodo_tc,
        "max_articulos": getattr(corrida, "max_articulos", 0) or 0,
        "max_paginas": getattr(settings, "LIT_MAX_PAGINAS", 10),
        "version_prompt": corrida.version_prompt,
        "version_prompt_sub": version_activa(clasificador.proveedor(), "sub"),
        "modelo": corrida.modelo_ia,
        "proveedor": clasificador.proveedor(),
        "reintentos_parseo": getattr(settings, "LIT_REINTENTOS_PARSEO", 1),
        "consulta": "adopt* AND FLOSS, journal articles, English",
    })


def ns_por_factor():
    return {f["id"]: f["ns"] for f in TABLA_5_3}


def _payload_articulo(item):
    return {
        "doi": item["doi"],
        "titulo": item["titulo"],
        "resumen": item["resumen"],
        "revista": item["revista"],
        "anio": item["anio"],
        "fuente": item["fuente"],
        "url": item["url"],
        "datos_crudos": item["datos_crudos"],
    }


def ejecutar(corrida):
    """Ejecuta la corrida por completo y devuelve la corrida actualizada."""
    corrida.estado = "ejecutando"
    corrida.iniciada_en = timezone.now()
    corrida.hash_config = config_hash(corrida)
    corrida.save(update_fields=["estado", "iniciada_en", "hash_config"])

    try:
        emitir(corrida, "Preparación", "Iniciando corrida", {
            "rango": corrida.rango,
            "fuentes": corrida.fuentes,
            "metodo_tc": corrida.metodo_tc,
            "modelo": corrida.modelo_ia,
            "prompt": corrida.version_prompt,
            "forzar_reanalisis": bool(getattr(corrida, "forzar_reanalisis", False)),
        })
        if corrida.anio_inicio > corrida.anio_fin:
            raise ValueError("El año de inicio no puede ser posterior al año de fin")
        if corrida.metodo_tc not in ("unicos", "menciones"):
            raise ValueError("metodo_tc debe ser 'unicos' o 'menciones'")

        limite = getattr(settings, "LIT_MAX_PAGINAS", 10)
        esperados = max(1, 200 * limite * max(1, len(corrida.fuentes)))
        tope = int(getattr(settings, "LIT_MAX_ARTICULOS", 0) or 0)
        tope_corrida = int(getattr(corrida, "max_articulos", 0) or 0)
        if tope_corrida > 0:
            tope = tope_corrida
        objetivo = tope or esperados
        descargados = 0
        articulos = []
        emitir(corrida, "Descarga", "Consultando fuentes", {"esperados": objetivo, "tope": tope or None})

        for item in fuentes.buscar(
            corrida.fuentes,
            corrida.anio_inicio,
            corrida.anio_fin,
            lambda fase, mensaje, datos, nivel="info": emitir(corrida, fase, mensaje, datos, nivel),
            limite,
        ):
            existente = Articulo.objects.filter(huella=item["huella"]).first()
            defaults = _payload_articulo(item)
            if existente and existente.resumen and not defaults["resumen"]:
                defaults["resumen"] = existente.resumen
                crudos = dict(defaults["datos_crudos"] or {})
                crudos["resumen_enriquecido"] = (
                    existente.datos_crudos.get("resumen_enriquecido") or "previo"
                )
                defaults["datos_crudos"] = crudos
            articulo, _ = Articulo.objects.update_or_create(
                huella=item["huella"], defaults=defaults
            )
            articulos.append(articulo)
            descargados += 1
            progreso(corrida, min(30, descargados / objetivo * 30), "Descarga")
            if tope and descargados >= tope:
                break

        corrida.total_articulos = len(articulos)
        corrida.save(update_fields=["total_articulos"])
        sufijo = f" (tope {tope})" if tope else ""
        emitir(corrida, "Descarga", f"{len(articulos)} artículos candidatos tras el prefiltro{sufijo}",
               {"articulos": len(articulos), "tope": tope or None}, "ok")
        if not articulos:
            raise RuntimeError("No se obtuvieron artículos; revisa las fuentes, el rango y las claves de API")

        catalogo = clasificador.catalogo()
        ids_a_factor = {
            sub["id"]: factor["id"]
            for factor in catalogo
            for sub in factor["subfactores"]
        }
        nombres_factor = {factor["id"]: factor["nombre"] for factor in catalogo}
        nombres_subfactor = {
            sub["id"]: sub["nombre"]
            for factor in catalogo
            for sub in factor["subfactores"]
        }
        por_factor_unicos = defaultdict(set)
        por_factor_menciones = Counter()
        por_factor_extendido = Counter()
        articulos_por_factor = defaultdict(list)
        articulos_por_factor_extendido = defaultdict(list)
        relevantes = 0
        cacheados = 0
        omitidos = 0

        for indice, articulo in enumerate(articulos, start=1):
            emitir(corrida, "Clasificación",
                   f"Analizando {indice}/{len(articulos)}: {articulo.titulo[:90]}", {
                       "tipo": "articulo",
                       "indice": indice,
                       "total": len(articulos),
                       "titulo": articulo.titulo,
                       "huella": articulo.huella,
                   })

            def notificar(etapa, info, articulo=articulo, indice=indice):
                if etapa == "rel":
                    relevante = bool(info.get("es_relevante"))
                    emitir(corrida, "Clasificación",
                           f"{'Relevante' if relevante else 'No relevante'}: {articulo.titulo[:90]}", {
                               "tipo": "relevancia",
                               "indice": indice,
                               "total": len(articulos),
                               "titulo": articulo.titulo,
                               "relevante": relevante,
                               "confianza": info.get("confianza"),
                               "desde_cache": bool(info.get("desde_cache")),
                           }, "ok" if relevante else "info", actualizar=False)
                    return
                sub_ids = [int(x) for x in (info.get("subfactores") or []) if str(x).isdigit()]
                ext_ids = [int(x) for x in (info.get("subfactores_extendidos") or []) if str(x).isdigit()]
                factor_ids = sorted({ids_a_factor.get(sid) for sid in sub_ids if ids_a_factor.get(sid)})
                ext_factor_ids = sorted({ids_a_factor.get(sid) for sid in ext_ids if ids_a_factor.get(sid)})
                nombres = [nombres_factor[fid] for fid in factor_ids if fid in nombres_factor]
                nombres_ext = [nombres_factor[fid] for fid in ext_factor_ids if fid in nombres_factor]
                emitir(corrida, "Clasificación",
                       f"Factores: {', '.join(nombres) if nombres else 'ninguno'}", {
                           "tipo": "factores",
                           "indice": indice,
                           "total": len(articulos),
                           "titulo": articulo.titulo,
                           "subfactores": [nombres_subfactor.get(sid, str(sid)) for sid in sub_ids],
                           "factores": nombres,
                           "subfactores_extendidos": [nombres_subfactor.get(sid, str(sid)) for sid in ext_ids],
                           "factores_extendidos": nombres_ext,
                           "desde_cache": bool(info.get("desde_cache")),
                       }, "ok", actualizar=False)

            try:
                (es_relevante, subfactores, evidencia, desde_cache,
                 subfactores_ext, evidencia_ext) = clasificador.clasificar(
                    articulo, corrida, notificar=notificar
                )
            except clasificador.GroqSinCupo as exc:
                corrida.total_relevantes = relevantes
                corrida.total_clasificados = indice - 1
                corrida.total_desde_cache = cacheados
                corrida.total_omitidos = omitidos
                corrida.estado = "pausada"
                corrida.progreso = min(95, 30 + (indice - 1) / len(articulos) * 55)
                corrida.mensaje = str(exc)
                corrida.terminada_en = None
                corrida.save(update_fields=[
                    "total_relevantes", "total_clasificados", "total_desde_cache",
                    "total_omitidos", "estado", "progreso", "mensaje", "terminada_en",
                ])
                emitir(corrida, "Pausada", str(exc), {
                    "tipo": "pausa",
                    "indice": indice,
                    "total": len(articulos),
                    "articulo_id": articulo.id,
                }, "aviso")
                return corrida
            except clasificador.RespuestaIAMalformada as exc:
                omitidos += 1
                emitir(corrida, "Clasificación", f"Artículo {indice} omitido: {exc}", {
                    "tipo": "omitido",
                    "indice": indice,
                    "total": len(articulos),
                    "titulo": articulo.titulo,
                    "articulo_id": articulo.id,
                    "huella": articulo.huella,
                }, "aviso")
            else:
                cacheados += desde_cache
                if es_relevante:
                    relevantes += 1
                    for sub_id in subfactores:
                        factor_id = ids_a_factor.get(int(sub_id))
                        if factor_id is None:
                            continue
                        por_factor_unicos[factor_id].add(articulo.huella)
                        por_factor_menciones[factor_id] += 1
                        if len(articulos_por_factor[factor_id]) < 200:
                            articulos_por_factor[factor_id].append({
                                "id": articulo.id,
                                "titulo": articulo.titulo,
                                "doi": articulo.doi,
                                "anio": articulo.anio,
                                "fuente": articulo.fuente,
                                "evidencia": evidencia.get(str(sub_id)) or evidencia.get(sub_id) or "",
                            })
                    for sub_id in subfactores_ext:
                        factor_id = ids_a_factor.get(int(sub_id))
                        if factor_id is None:
                            continue
                        por_factor_extendido[factor_id] += 1
                        if len(articulos_por_factor_extendido[factor_id]) < 200:
                            articulos_por_factor_extendido[factor_id].append({
                                "id": articulo.id,
                                "titulo": articulo.titulo,
                                "doi": articulo.doi,
                                "anio": articulo.anio,
                                "fuente": articulo.fuente,
                                "evidencia": evidencia_ext.get(str(sub_id)) or evidencia_ext.get(sub_id) or "",
                            })
            corrida.total_relevantes = relevantes
            corrida.total_clasificados = indice
            corrida.total_desde_cache = cacheados
            corrida.total_omitidos = omitidos
            corrida.save(update_fields=[
                "total_relevantes", "total_clasificados", "total_desde_cache", "total_omitidos",
            ])
            progreso(corrida, 30 + indice / len(articulos) * 55, "Clasificación")

        sufijo_forzado = " (caché ignorada)" if getattr(corrida, "forzar_reanalisis", False) else ""
        emitir(corrida, "Clasificación",
               f"{relevantes} artículos sobre adopción FLOSS; {cacheados} etiquetas reutilizadas de caché; "
               f"{omitidos} omitidos{sufijo_forzado}",
               {"relevantes": relevantes, "desde_cache": cacheados, "omitidos": omitidos,
                "forzar_reanalisis": bool(getattr(corrida, "forzar_reanalisis", False))}, "ok")

        cantidades = {}
        for factor in TABLA_5_3:
            fid = factor["id"]
            cantidades[fid] = (
                len(por_factor_unicos[fid]) if corrida.metodo_tc == "unicos" else por_factor_menciones[fid]
            )
        calculado = calculo.calcular(cantidades, ns_por_factor())
        cantidades_extendidas = {}
        for factor in TABLA_5_3:
            fid = factor["id"]
            cantidades_extendidas[fid] = por_factor_extendido[fid]
        calculado_ext = calculo.calcular(cantidades_extendidas, ns_por_factor())
        metricas_ext = calculo.comparar(calculado_ext["factores"])
        for fila in calculado_ext["factores"]:
            fila["articulos"] = articulos_por_factor_extendido[fila["id"]][:50]
        metricas_ext["factores"] = calculado_ext["factores"]
        metricas_ext["articulos_por_factor"] = {
            str(fid): articulos_por_factor_extendido[fid][:50] for fid in ns_por_factor()
        }
        corrida.cortes = calculado["cortes"]
        emitir(corrida, "Cálculo", f"Cuartiles: {[round(c, 4) for c in calculado['cortes']]}",
               {"cortes": calculado["cortes"]})

        factores = Factor.objects.in_bulk()
        with transaction.atomic():
            ResultadoFactor.objects.filter(corrida=corrida).delete()
            for fila in calculado["factores"]:
                fid = fila["id"]
                ResultadoFactor.objects.create(
                    corrida=corrida,
                    factor=factores[fid],
                    ns=fila["ns"],
                    tc_unicos=len(por_factor_unicos[fid]),
                    tc_menciones=por_factor_menciones[fid],
                    tc=fila["tc"],
                    r=fila["r"],
                    il=fila["il"],
                    is_calculada=fila["is"],
                    il_tesis=fila["il_tesis"],
                    is_tesis=fila["is_tesis"],
                    diff_il=fila["diff_il"],
                    diff_is=fila["diff_is"],
                    articulos=articulos_por_factor[fid],
                )

        canonical = json.dumps(
            [[r["id"], r["tc"], r["il"], r["is"]] for r in calculado["factores"]],
            separators=(",", ":"),
        )
        corrida.hash_resultado = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        corrida.es_reproduccion = Corrida.objects.filter(
            hash_config=corrida.hash_config,
            hash_resultado=corrida.hash_resultado,
        ).exclude(pk=corrida.pk).exists()
        corrida.metricas = calculo.comparar(calculado["factores"])
        corrida.metricas["extendido"] = metricas_ext
        emitir(corrida, "Cálculo",
               f"Capa extendida: {metricas_ext['il_exactos']}/{metricas_ext['total']} IL exactos; "
               f"TC total {sum(r['tc'] for r in calculado_ext['factores'])}",
               {"extendido": {k: v for k, v in metricas_ext.items() if k != "factores"}}, "ok")
        corrida.estado = "listo"
        corrida.progreso = 100
        corrida.terminada_en = timezone.now()
        corrida.save(update_fields=[
            "cortes", "hash_resultado", "es_reproduccion", "metricas", "estado",
            "progreso", "terminada_en",
        ])
        emitir(corrida, "Listo", "Cálculo finalizado", corrida.metricas, "ok")
        return corrida
    except Exception as exc:
        corrida.estado = "error"
        corrida.terminada_en = timezone.now()
        corrida.mensaje = str(exc)
        corrida.save(update_fields=["estado", "terminada_en", "mensaje"])
        emitir(corrida, "Error", str(exc), {}, "error")
        return corrida


def iniciar_en_hilo(corrida):
    hilo = threading.Thread(target=ejecutar, args=(corrida,), daemon=True,
                            name=f"literatura-{corrida.pk}")
    hilo.start()
    return hilo


def reanudar(corrida):
    """Reanuda una corrida pausada; las etiquetas ya cacheadas evitan nueva IA."""
    if corrida.estado != "pausada":
        raise ValueError("Solo se puede reanudar una corrida pausada")
    corrida.estado = "pendiente"
    corrida.mensaje = "Reanudando corrida"
    corrida.terminada_en = None
    corrida.save(update_fields=["estado", "mensaje", "terminada_en"])
    iniciar_en_hilo(corrida)
    return corrida


def activar(corrida):
    """Aplica la IS calculada al catálogo. Guarda los valores anteriores para revertir."""
    if corrida.estado != "listo":
        raise ValueError("Solo se puede activar una corrida terminada correctamente")
    with transaction.atomic():
        for otra in Corrida.objects.filter(activada=True).exclude(pk=corrida.pk):
            _desactivar(otra)
        if not corrida.activada:
            corrida.is_anterior = {
                str(f.id): f.importancia_sugerida for f in Factor.objects.all()
            }
            for resultado in corrida.resultados.select_related("factor"):
                factor = resultado.factor
                factor.importancia_sugerida = resultado.is_calculada
                factor.save(update_fields=["importancia_sugerida"])
            corrida.activada = True
            corrida.save(update_fields=["activada", "is_anterior"])
    return corrida


def _desactivar(corrida):
    for factor_id, valor in corrida.is_anterior.items():
        Factor.objects.filter(pk=int(factor_id)).update(importancia_sugerida=valor)
    corrida.activada = False
    corrida.save(update_fields=["activada"])


def desactivar(corrida):
    with transaction.atomic():
        _desactivar(corrida)
    return corrida


def restablecer_catalogo_tesis():
    """Devuelve la IS del catálogo a los valores de la Tabla 5.3 de la tesis."""
    with transaction.atomic():
        for fila in TABLA_5_3:
            Factor.objects.filter(pk=fila["id"]).update(
                importancia_sugerida=fila["is"]
            )
        Corrida.objects.filter(activada=True).update(activada=False)
