# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Evaluacion, EvaluacionFactor, EvaluacionSubfactor
from .serializers import EvaluacionCreateSerializer, EvaluacionListSerializer
from factores.models import Factor, Subfactor
from recomendaciones.services import calcular_resultado_evaluacion


class EvaluacionListCreateView(APIView):
    def get(self, request):
        evaluaciones = Evaluacion.objects.all()
        serializer = EvaluacionListSerializer(evaluaciones, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EvaluacionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        evaluacion = Evaluacion.objects.create(nombre=data['nombre'])

        for f_data in data['factores']:
            factor = get_object_or_404(Factor, pk=f_data['factor_id'])
            ef = EvaluacionFactor.objects.create(
                evaluacion=evaluacion,
                factor=factor,
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
