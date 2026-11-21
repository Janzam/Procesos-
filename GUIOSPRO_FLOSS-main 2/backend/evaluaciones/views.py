# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from . import plantilla
from .models import Evaluacion, EvaluacionFactor, EvaluacionSubfactor, CAMPOS_SOFTWARE
from .serializers import EvaluacionCreateSerializer, EvaluacionListSerializer
from factores.models import Factor, Subfactor
from recomendaciones.services import (
    calcular_resultado_evaluacion, calcular_resultados_evaluaciones,
    diagnostico, respuestas_determinantes, plan_minimo, DESFAVORABLES,
)
from recomendaciones import ia


def _validar_factores(data):
    """
    Comprueba el payload antes de tocar la base de datos y devuelve
    (factores_por_id, subfactores_por_id, errores).

    Un factor con alcance 'Ambos' no puede clasificarse en FODA sin que el decisor
    elija Interno o Externo: antes se aceptaba nulo y el cálculo lo trataba como
    Externo sin avisar.
    """
    factores_db = Factor.objects.in_bulk([f['factor_id'] for f in data['factores']])
    errores = []
    for f_data in data['factores']:
        factor = factores_db.get(f_data['factor_id'])
        if factor is None:
            errores.append(f"El factor con id {f_data['factor_id']} no existe.")
        elif factor.alcance == 'Ambos' and not f_data.get('alcance_elegido'):
            errores.append(
                f"El factor '{factor.nombre}' tiene alcance 'Ambos': "
                f"se requiere alcance_elegido ('Interno' o 'Externo')."
            )

    ids_factor = [f_data['factor_id'] for f_data in data['factores']]
    repetidos_f = sorted({i for i in ids_factor if ids_factor.count(i) > 1})
    if repetidos_f:
        errores.append(f'Los factores con id {repetidos_f} aparecen más de una vez.')

    respuestas = [r for f_data in data['factores'] for r in f_data.get('subfactores', [])]
    subfactores_db = Subfactor.objects.in_bulk([r['subfactor_id'] for r in respuestas])
    faltan = sorted({r['subfactor_id'] for r in respuestas if r['subfactor_id'] not in subfactores_db})
    if faltan:
        errores.append(f'Los subfactores con id {faltan} no existen.')
    # Antes, una respuesta repetida llegaba a la base de datos y provocaba un
    # error 500 por la restricción de unicidad; ahora se explica como un 400.
    ids_sub = [r['subfactor_id'] for r in respuestas]
    repetidos = sorted({i for i in ids_sub if ids_sub.count(i) > 1})
    if repetidos:
        errores.append(f'Los subfactores con id {repetidos} tienen más de una respuesta.')
    ajenos = sorted({
        r['subfactor_id'] for f_data in data['factores'] for r in f_data.get('subfactores', [])
        if r['subfactor_id'] in subfactores_db
        and subfactores_db[r['subfactor_id']].factor_id != f_data['factor_id']
    })
    if ajenos:
        errores.append(f'Los subfactores con id {ajenos} no pertenecen al factor en el que se enviaron.')

    return factores_db, subfactores_db, errores


def _escribir_respuestas(evaluacion, data, factores_db, subfactores_db):
    """
    Deja la evaluación con exactamente las respuestas del payload.

    Al editar se borra lo anterior y se vuelve a escribir: es más simple y más
    seguro que conciliar diferencias, y el coste es el mismo porque de todos modos
    son dos inserciones en bloque.
    """
    evaluacion.factores_eval.all().delete()
    evaluacion.subfactores_eval.all().delete()

    EvaluacionFactor.objects.bulk_create([
        EvaluacionFactor(
            evaluacion=evaluacion,
            factor=factores_db[f_data['factor_id']],
            importancia_decisor=f_data['importancia_decisor'],
            alcance_elegido=f_data.get('alcance_elegido'),
        )
        for f_data in data['factores']
    ])
    EvaluacionSubfactor.objects.bulk_create([
        EvaluacionSubfactor(
            evaluacion=evaluacion,
            subfactor=subfactores_db[r['subfactor_id']],
            valor=r['valor'],
            origen=r.get('origen', 'manual'),
        )
        for f_data in data['factores']
        for r in f_data.get('subfactores', [])
    ])


def _validar_peticion(request):
    return _validar_datos(request.data)


def _validar_datos(datos):
    """
    Valida el cuerpo de una creación o edición y devuelve
    (datos, factores_por_id, subfactores_por_id).

    Los errores se lanzan como ValidationError: DRF los convierte en un 400 con el
    mismo cuerpo que antes devolvían las vistas a mano. La importación de plantillas
    pasa por aquí igual que el asistente.
    """
    serializer = EvaluacionCreateSerializer(data=datos)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    factores_db, subfactores_db, errores = _validar_factores(data)
    if errores:
        raise ValidationError({'factores': errores})
    return data, factores_db, subfactores_db


class EvaluacionListCreateView(APIView):
    def get(self, request):
        evaluaciones = list(Evaluacion.objects.all())
        data = EvaluacionListSerializer(evaluaciones, many=True).data
        # Código de recomendación para la lista del historial. Se resuelven todas
        # de una vez: dos consultas en total, no dos por evaluación.
        resultados = calcular_resultados_evaluaciones(evaluaciones)
        for item in data:
            res = resultados[item['id']]
            factores = res['factores']
            # Resumen por evaluación para las tarjetas del panel y del historial.
            # Sale del mismo resultado ya calculado: no cuesta consultas extra.
            ponderados = [f for f in factores if f['relevante'] and f['ponderacion_global'] is not None]
            item['recomendacion_codigo'] = res['recomendacion']['codigo'] or None
            item['factores_relevantes'] = sum(1 for f in factores if f['relevante'])
            item['factores_desfavorables'] = sum(1 for f in ponderados if f['foda_categoria'] in DESFAVORABLES)
            item['ponderacion_media'] = (
                round(sum(f['ponderacion_global'] for f in ponderados) / len(ponderados), 2)
                if ponderados else None
            )
        return Response(data)

    def post(self, request):
        evaluacion = _crear(*_validar_peticion(request))
        return Response(
            {"id": evaluacion.id, "resultado": calcular_resultado_evaluacion(evaluacion)},
            status=status.HTTP_201_CREATED,
        )


def _crear(data, factores_db, subfactores_db):
    # Todo o nada: si algo falla a mitad del guardado no queda una evaluación
    # incompleta en la base de datos.
    with transaction.atomic():
        evaluacion = Evaluacion.objects.create(
            nombre=data['nombre'],
            **{c: data.get(c, '') for c in CAMPOS_SOFTWARE},
        )
        _escribir_respuestas(evaluacion, data, factores_db, subfactores_db)
    return evaluacion


def _plantilla_habilitada():
    from django.conf import settings
    return getattr(settings, 'PLANTILLA_HABILITADA', True)


def _sin_plantilla():
    return Response({"detail": "La evaluación con plantilla está desactivada en esta instalación."},
                    status=status.HTTP_404_NOT_FOUND)


class FuncionesView(APIView):
    """Funciones opcionales activas en esta instalación, para que la interfaz las muestre u oculte."""

    def get(self, request):
        return Response({"plantilla": _plantilla_habilitada()})


class PlantillaView(APIView):
    """
    Descarga la plantilla Excel para evaluar sin el asistente. Se genera en cada
    petición a partir del catálogo actual, así que siempre refleja los factores y
    subfactores vigentes.
    """

    def get(self, request):
        if not _plantilla_habilitada():
            return _sin_plantilla()
        contenido = plantilla.generar_plantilla()
        resp = HttpResponse(
            contenido,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        resp['Content-Disposition'] = (
            f'attachment; filename="plantilla_guiosad_{plantilla.version_catalogo()}.xlsx"'
        )
        # El catálogo puede cambiar (al aplicar una corrida de literatura): nunca
        # se sirve una plantilla guardada en caché.
        resp['Cache-Control'] = 'no-store'
        return resp


class CatalogoEstadoView(APIView):
    """
    Con qué catálogo se calcula hoy: versión (la misma huella que lleva la
    plantilla), origen de la importancia sugerida (Tabla 5.3 o una corrida de
    literatura aplicada) y la IS vigente de cada factor. Todas las evaluaciones,
    también las anteriores, se calculan con esta IS al mostrarse.
    """

    def get(self, request):
        from literatura.models import Corrida

        factores = plantilla._catalogo()
        corrida = Corrida.objects.filter(activada=True).order_by('-id').first()
        return Response({
            'version': plantilla.version_catalogo(factores),
            'origen': 'literatura' if corrida else 'tesis',
            'corrida': (
                {'id': corrida.id, 'nombre': corrida.nombre,
                 'rango': corrida.rango}
                if corrida else None
            ),
            'factores': [
                {'id': f.id, 'nombre': f.nombre, 'dimension': f.dimension.nombre,
                 'importancia_sugerida': f.importancia_sugerida}
                for f in factores
            ],
        })


class ImportarPlantillaView(APIView):
    """
    Recibe la plantilla llena, crea la evaluación y devuelve su resultado.

    El archivo solo se traduce a la misma evaluación que construye el asistente; el
    cálculo es el del motor (services), de modo que cualquier cambio en las fórmulas
    se refleja aquí sin tocar esta vista.
    """
    parser_classes = [MultiPartParser]
    TAMANO_MAXIMO = 5 * 1024 * 1024

    def post(self, request):
        if not _plantilla_habilitada():
            return _sin_plantilla()
        archivo = request.FILES.get('archivo')
        if archivo is None:
            raise ValidationError({'archivo': ['Adjunte la plantilla en el campo «archivo».']})
        if not archivo.name.lower().endswith('.xlsx'):
            raise ValidationError({'archivo': ['La plantilla debe ser un archivo .xlsx.']})
        if archivo.size > self.TAMANO_MAXIMO:
            raise ValidationError({'archivo': ['El archivo supera los 5 MB.']})
        try:
            datos, resumen = plantilla.leer_plantilla(archivo)
        except plantilla.PlantillaInvalida as e:
            raise ValidationError({'archivo': e.errores})

        evaluacion = _crear(*_validar_datos(datos))
        return Response(
            {"id": evaluacion.id, "resultado": calcular_resultado_evaluacion(evaluacion), "resumen": resumen},
            status=status.HTTP_201_CREATED,
        )


class DashboardView(APIView):
    """
    origen: nuevo | métricas agregadas de todas las evaluaciones para el panel Dashboard.
    """
    def get(self, request):
        evaluaciones = list(Evaluacion.objects.all())
        resultados = calcular_resultados_evaluaciones(evaluaciones)
        total = len(evaluaciones)

        recomendaciones = {"A": 0, "B": 0, "C": 0}
        foda = {"Fortaleza": 0, "Oportunidad": 0, "Debilidad": 0, "Amenaza": 0}
        dimensiones = {}          # nombre -> [suma, n]
        frecuencia_problemas = {} # factor -> {nombre, dimension, veces}
        relevantes_total = 0
        ponderaciones = []
        recientes = []
        por_dia = {}

        for ev in evaluaciones:
            res = resultados[ev.id]
            cod = res["recomendacion"]["codigo"]
            if cod in recomendaciones:
                recomendaciones[cod] += 1

            dia = ev.creado_en.date().isoformat()
            por_dia[dia] = por_dia.get(dia, 0) + 1

            relevantes = sum(1 for f in res["factores"] if f["relevante"])
            relevantes_total += relevantes

            for f in res["factores"]:
                p = f["ponderacion_global"]
                if p is not None:
                    ponderaciones.append(p)
                    acc = dimensiones.setdefault(f["dimension"], [0.0, 0])
                    acc[0] += p
                    acc[1] += 1
                cat = f["foda_categoria"]
                if cat in foda:
                    foda[cat] += 1
                if cat in ("Debilidad", "Amenaza"):
                    item = frecuencia_problemas.setdefault(
                        f["factor_id"], {"factor_id": f["factor_id"], "factor_nombre": f["factor_nombre"],
                                         "dimension": f["dimension"], "veces": 0})
                    item["veces"] += 1

            if len(recientes) < 6:
                recientes.append({
                    "id": ev.id, "nombre": ev.nombre, "creado_en": ev.creado_en,
                    "recomendacion_codigo": cod or None,
                    "relevantes": relevantes,
                })

        problemas_frecuentes = sorted(frecuencia_problemas.values(), key=lambda x: -x["veces"])[:8]

        return Response({
            "total_evaluaciones": total,
            "recomendaciones": recomendaciones,
            "foda": foda,
            "factores_relevantes_promedio": round(relevantes_total / total, 1) if total else 0,
            "ponderacion_promedio": round(sum(ponderaciones) / len(ponderaciones), 2) if ponderaciones else None,
            "ponderacion_por_dimension": [
                {"dimension": d, "ponderacion": round(s / n, 2), "n": n}
                for d, (s, n) in dimensiones.items()
            ],
            "problemas_frecuentes": problemas_frecuentes,
            "evaluaciones_por_dia": [{"dia": d, "total": n} for d, n in sorted(por_dia.items())],
            "recientes": recientes,
        })


class EvaluacionDetailView(APIView):
    def get(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        # Valor y procedencia de cada respuesta salen de una sola consulta.
        respuestas = list(evaluacion.subfactores_eval.values_list('subfactor_id', 'valor', 'origen'))
        return Response({
            "id": evaluacion.id,
            "nombre": evaluacion.nombre,
            "creado_en": evaluacion.creado_en,
            "software": evaluacion.datos_software(),
            "resultado": calcular_resultado_evaluacion(evaluacion),
            # Las respuestas tal como las dio el decisor. Son lo que necesita el
            # asistente para reabrir la evaluación y poder editarla.
            "respuestas": {
                "factores": {
                    str(factor_id): {
                        "importancia_decisor": importancia,
                        "alcance_elegido": alcance,
                    }
                    for factor_id, importancia, alcance in evaluacion.factores_eval.values_list(
                        'factor_id', 'importancia_decisor', 'alcance_elegido')
                },
                "subfactores": {str(sid): valor for sid, valor, _ in respuestas},
                "origenes": {str(sid): origen for sid, _, origen in respuestas},
            },
        })

    def put(self, request, pk):
        """Reemplaza los datos y las respuestas de una evaluación ya guardada."""
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        data, factores_db, subfactores_db = _validar_peticion(request)

        with transaction.atomic():
            evaluacion.nombre = data['nombre']
            for c in CAMPOS_SOFTWARE:
                setattr(evaluacion, c, data.get(c, ''))
            # Las respuestas cambian: los textos del asistente ya no corresponden.
            evaluacion.informe_ia = evaluacion.informe_firma = evaluacion.informe_modelo = ''
            evaluacion.informe_fecha = None
            evaluacion.plan_ia = evaluacion.plan_firma = ''
            evaluacion.save(update_fields=[
                'nombre', *CAMPOS_SOFTWARE, 'informe_ia', 'informe_firma', 'informe_modelo',
                'informe_fecha', 'plan_ia', 'plan_firma',
            ])
            _escribir_respuestas(evaluacion, data, factores_db, subfactores_db)

        return Response({
            "id": evaluacion.id,
            "resultado": calcular_resultado_evaluacion(evaluacion),
        })

    def delete(self, request, pk):
        """
        Borra la evaluación y, en cascada, sus respuestas.

        El catálogo no se toca: lo que desaparece son las respuestas de este
        decisor, no las dimensiones, factores ni subfactores de la metodología.
        """
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        evaluacion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DiagnosticoView(APIView):
    """
    Explica el resultado obtenido: que factores lo causan, de que informacion
    depende cada uno y que conviene revisar antes de decidir. No recalcula nada.
    """

    def get(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        return Response(diagnostico(evaluacion))


class RespuestasDeterminantesView(APIView):
    """RF-23 · Respuestas que por si solas alterarian la recomendacion."""

    def get(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        return Response(respuestas_determinantes(evaluacion))


class PlanMinimoView(APIView):
    """
    RF-24 · Conjunto minimo de cambios que llevaria a una recomendacion mejor.

    GET  devuelve solo el calculo determinista.
    POST devuelve lo mismo mas la redaccion del asistente. Se separan a proposito:
    el calculo no cuesta nada y esta siempre disponible; la redaccion invoca al
    proveedor del modelo y puede no estarlo.
    """

    def get(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        return Response(plan_minimo(evaluacion))

    def post(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        plan = plan_minimo(evaluacion)
        if not plan.get("bloqueantes"):
            return Response({**plan, "narracion": None})
        firma = _firma({"software": evaluacion.datos_software(), "plan": plan})
        # Si ya se redactó para este mismo plan, se reutiliza: no se vuelve a
        # llamar al modelo cada vez que se abre la evaluación.
        if evaluacion.plan_ia and evaluacion.plan_firma == firma:
            return Response({**plan, "narracion": evaluacion.plan_ia})
        try:
            texto = ia.redactar_plan(evaluacion.datos_software(), plan)
        except ia.IANoDisponible as e:
            # El plan determinista se entrega igualmente: el asistente es opcional.
            return Response({**plan, "narracion": None, "narracion_error": str(e)})
        evaluacion.plan_ia, evaluacion.plan_firma = texto, firma
        evaluacion.save(update_fields=['plan_ia', 'plan_firma'])
        return Response({**plan, "narracion": texto})


def _firma(datos) -> str:
    """Huella estable de un resultado: cambia si cambia cualquier cosa que lo determine."""
    import hashlib
    import json
    return hashlib.sha1(json.dumps(datos, sort_keys=True, default=str).encode()).hexdigest()


def _firma_informe(evaluacion, resultado) -> str:
    return _firma({
        "software": evaluacion.datos_software(),
        "recomendacion": resultado.get("recomendacion", {}).get("codigo"),
        "factores": [
            (f.get("factor_id") or f.get("factor_nombre"), f.get("foda_categoria"), f.get("ponderacion_global"))
            for f in resultado.get("factores", [])
        ],
    })


class InformeEjecutivoView(APIView):
    """
    RF-18 · Informe ejecutivo redactado por el asistente.

    GET  devuelve el informe guardado (si existe) y si sigue vigente.
    POST lo redacta solo si no hay uno vigente; con {"forzar": true} lo
         vuelve a redactar. El texto se guarda en la evaluación, de modo que se
         mantiene igual mientras la evaluación no cambie.
    """

    def _respuesta(self, evaluacion, vigente):
        return Response({
            "id": evaluacion.id,
            "informe": evaluacion.informe_ia or None,
            "modelo": evaluacion.informe_modelo,
            "fecha": evaluacion.informe_fecha,
            "vigente": vigente,
        })

    def get(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        firma = _firma_informe(evaluacion, calcular_resultado_evaluacion(evaluacion))
        return self._respuesta(evaluacion, bool(evaluacion.informe_ia) and evaluacion.informe_firma == firma)

    def post(self, request, pk):
        from django.utils import timezone

        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        resultado = calcular_resultado_evaluacion(evaluacion)
        firma = _firma_informe(evaluacion, resultado)
        forzar = bool(request.data.get("forzar")) if hasattr(request, "data") else False
        if evaluacion.informe_ia and evaluacion.informe_firma == firma and not forzar:
            return self._respuesta(evaluacion, True)
        try:
            texto = ia.redactar_informe(evaluacion.datos_software(), resultado)
        except ia.IANoDisponible as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        evaluacion.informe_ia = texto
        evaluacion.informe_modelo = ia.estado().get("modelo", "")
        evaluacion.informe_firma = firma
        evaluacion.informe_fecha = timezone.now()
        evaluacion.save(update_fields=['informe_ia', 'informe_modelo', 'informe_firma', 'informe_fecha'])
        return self._respuesta(evaluacion, True)
