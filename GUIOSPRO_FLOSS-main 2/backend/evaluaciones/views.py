# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Evaluacion, EvaluacionFactor, EvaluacionSubfactor
from .serializers import EvaluacionCreateSerializer, EvaluacionListSerializer
from factores.models import Factor, Subfactor
from recomendaciones.services import calcular_resultado_evaluacion


class EvaluacionListCreateView(APIView):
    def get(self, request):
        evaluaciones = Evaluacion.objects.all()
        data = EvaluacionListSerializer(evaluaciones, many=True).data
        # Código de recomendación para mostrarlo en la lista del historial
        por_id = {ev.id: ev for ev in evaluaciones}
        for item in data:
            resultado = calcular_resultado_evaluacion(por_id[item['id']])
            item['recomendacion_codigo'] = resultado['recomendacion']['codigo'] or None
        return Response(data)

    def post(self, request):
        serializer = EvaluacionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Validación previa a cualquier escritura: un factor con alcance 'Ambos' no
        # puede clasificarse en FODA sin que el decisor elija Interno o Externo.
        # Antes se aceptaba nulo y el cálculo lo trataba como Externo sin avisar.
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
        if errores:
            return Response({'factores': errores}, status=status.HTTP_400_BAD_REQUEST)

        # Todo o nada: si algo falla a mitad del guardado no queda una evaluación
        # incompleta en la base de datos.
        with transaction.atomic():
            evaluacion = Evaluacion.objects.create(nombre=data['nombre'])

            for f_data in data['factores']:
                EvaluacionFactor.objects.create(
                    evaluacion=evaluacion,
                    factor=factores_db[f_data['factor_id']],
                    importancia_decisor=f_data['importancia_decisor'],
                    alcance_elegido=f_data.get('alcance_elegido'),
                )
                for s_data in f_data.get('subfactores', []):
                    subfactor = get_object_or_404(Subfactor, pk=s_data['subfactor_id'])
                    EvaluacionSubfactor.objects.create(
                        evaluacion=evaluacion,
                        subfactor=subfactor,
                        valor=s_data['valor'],
                    )

        resultado = calcular_resultado_evaluacion(evaluacion)
        return Response({"id": evaluacion.id, "resultado": resultado}, status=status.HTTP_201_CREATED)


class DashboardView(APIView):
    """
    origen: nuevo | métricas agregadas de todas las evaluaciones para el panel Dashboard.
    """
    def get(self, request):
        evaluaciones = list(Evaluacion.objects.all())
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
            res = calcular_resultado_evaluacion(ev)
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
        resultado = calcular_resultado_evaluacion(evaluacion)
        return Response({
            "id": evaluacion.id,
            "nombre": evaluacion.nombre,
            "creado_en": evaluacion.creado_en,
            "resultado": resultado,
        })
