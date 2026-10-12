# origen: main.py (funciones de cálculo IR) | cambio: expuesto como endpoint REST
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from .services import matriz_importancia_relativa, NIVELES
from . import ia
from factores.models import Factor


class MatrizIRView(APIView):
    """
    Matriz 4x4 con la Importancia Relativa de cada combinación (IS, ID).
    El frontend la consume una sola vez y la consulta como matriz[IS-1][ID-1],
    de modo que la fórmula IR vive únicamente en el backend.
    """
    def get(self, request):
        return Response({
            "niveles": NIVELES,
            "matriz": matriz_importancia_relativa(),
        })


class EstadoIAView(APIView):
    """
    Indica si el asistente con IA puede usarse en esta instalacion.

    El frontend lo consulta al arrancar para mostrar u ocultar el asistente: sin
    credencial el sistema sigue siendo plenamente utilizable (RNF-13).
    """
    def get(self, request):
        return Response(ia.estado())


class SugerenciaInputSerializer(serializers.Serializer):
    factor_id = serializers.IntegerField()
    software_nombre = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    version = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    licencia = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    proveedor = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


class SugerenciasView(APIView):
    """
    RF-17 · Propone una valoracion para cada subfactor de un factor.

    No escribe nada: devuelve propuestas que el decisor acepta, corrige o descarta.
    Los subfactores se leen del catalogo en el servidor, de modo que el cliente no
    puede pedir valoraciones sobre criterios que no existen.
    """
    def post(self, request):
        serializer = SugerenciaInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        datos = serializer.validated_data

        factor = get_object_or_404(Factor, pk=datos['factor_id'])
        subfactores = [
            {"id": s.id, "nombre": s.nombre}
            for s in factor.subfactores.all().order_by('orden', 'id')
        ]

        try:
            propuestas = ia.sugerir_valoraciones(datos, factor.nombre, subfactores)
        except ia.IANoDisponible as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({
            "factor_id": factor.id,
            "factor_nombre": factor.nombre,
            "modelo": ia.MODELO,
            "valoraciones": propuestas,
            "aviso": "Son propuestas: ninguna se guarda hasta que el decisor la confirme.",
        })
