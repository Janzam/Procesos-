# origen: main.py (funciones de cálculo IR) | cambio: expuesto como endpoint REST
from rest_framework.views import APIView
from rest_framework.response import Response
from .services import matriz_importancia_relativa, NIVELES


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
