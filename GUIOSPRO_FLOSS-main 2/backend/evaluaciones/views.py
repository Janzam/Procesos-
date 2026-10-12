# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Evaluacion, EvaluacionFactor, EvaluacionSubfactor
from .serializers import (
    EvaluacionCreateSerializer, EvaluacionListSerializer, CAMPOS_SOFTWARE,
)
from factores.models import Factor, Subfactor
from recomendaciones.services import (
    calcular_resultado_evaluacion, calcular_resultados_evaluaciones,
    diagnostico, respuestas_determinantes, plan_minimo,
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

    respuestas = [r for f_data in data['factores'] for r in f_data.get('subfactores', [])]
    subfactores_db = Subfactor.objects.in_bulk([r['subfactor_id'] for r in respuestas])
    faltan = sorted({r['subfactor_id'] for r in respuestas if r['subfactor_id'] not in subfactores_db})
    if faltan:
        errores.append(f'Los subfactores con id {faltan} no existen.')

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


class EvaluacionListCreateView(APIView):
    def get(self, request):
        evaluaciones = list(Evaluacion.objects.all())
        data = EvaluacionListSerializer(evaluaciones, many=True).data
        # Código de recomendación para la lista del historial. Se resuelven todas
        # de una vez: dos consultas en total, no dos por evaluación.
        resultados = calcular_resultados_evaluaciones(evaluaciones)
        for item in data:
            item['recomendacion_codigo'] = resultados[item['id']]['recomendacion']['codigo'] or None
        return Response(data)

    def post(self, request):
        serializer = EvaluacionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        factores_db, subfactores_db, errores = _validar_factores(data)
        if errores:
            return Response({'factores': errores}, status=status.HTTP_400_BAD_REQUEST)

        # Todo o nada: si algo falla a mitad del guardado no queda una evaluación
        # incompleta en la base de datos.
        with transaction.atomic():
            evaluacion = Evaluacion.objects.create(
                nombre=data['nombre'],
                **{c: data.get(c, '') for c in CAMPOS_SOFTWARE},
            )
            _escribir_respuestas(evaluacion, data, factores_db, subfactores_db)

        return Response(
            {"id": evaluacion.id, "resultado": calcular_resultado_evaluacion(evaluacion)},
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

            for f in res["factores"]:
                if f["relevante"]:
                    relevantes_total += 1
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
                    "relevantes": sum(1 for f in res["factores"] if f["relevante"]),
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
        return Response({
            "id": evaluacion.id,
            "nombre": evaluacion.nombre,
            "creado_en": evaluacion.creado_en,
            "software": {c: getattr(evaluacion, c) for c in CAMPOS_SOFTWARE},
            "resultado": calcular_resultado_evaluacion(evaluacion),
            # Las respuestas tal como las dio el decisor. Son lo que necesita el
            # asistente para reabrir la evaluación y poder editarla.
            "respuestas": {
                "factores": {
                    str(ef.factor_id): {
                        "importancia_decisor": ef.importancia_decisor,
                        "alcance_elegido": ef.alcance_elegido,
                    }
                    for ef in evaluacion.factores_eval.all()
                },
                "subfactores": {
                    str(sid): valor
                    for sid, valor in evaluacion.subfactores_eval.values_list('subfactor_id', 'valor')
                },
                "origenes": {
                    str(sid): origen
                    for sid, origen in evaluacion.subfactores_eval.values_list('subfactor_id', 'origen')
                },
            },
        })

    def put(self, request, pk):
        """Reemplaza los datos y las respuestas de una evaluación ya guardada."""
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        serializer = EvaluacionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        factores_db, subfactores_db, errores = _validar_factores(data)
        if errores:
            return Response({'factores': errores}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            evaluacion.nombre = data['nombre']
            for c in CAMPOS_SOFTWARE:
                setattr(evaluacion, c, data.get(c, ''))
            evaluacion.save(update_fields=['nombre', *CAMPOS_SOFTWARE])
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
        software = {c: getattr(evaluacion, c) for c in CAMPOS_SOFTWARE}
        try:
            plan = {**plan, "narracion": ia.redactar_plan(software, plan)}
        except ia.IANoDisponible as e:
            # El plan determinista se entrega igualmente: el asistente es opcional.
            plan = {**plan, "narracion": None, "narracion_error": str(e)}
        return Response(plan)


class InformeEjecutivoView(APIView):
    """
    RF-18 · Redacta en prosa el resultado ya calculado.

    Es POST porque invoca al proveedor del modelo; no modifica la evaluacion.
    """

    def post(self, request, pk):
        evaluacion = get_object_or_404(Evaluacion, pk=pk)
        resultado = calcular_resultado_evaluacion(evaluacion)
        software = {c: getattr(evaluacion, c) for c in CAMPOS_SOFTWARE}
        try:
            texto = ia.redactar_informe(software, resultado)
        except ia.IANoDisponible as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({
            "id": evaluacion.id,
            "modelo": ia.MODELO,
            "informe": texto,
        })
