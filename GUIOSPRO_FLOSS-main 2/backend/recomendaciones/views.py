# origen: main.py (compute_recommendation, funciones de cálculo IR) | cambio: expuesto como endpoint REST
from rest_framework.views import APIView
from rest_framework.response import Response
from .services import calcular_importancia_relativa, calcular_recomendacion


class IRCalculoView(APIView):
    """Endpoint utilitario para calcular IR en tiempo real desde el frontend (Paso 1-2)."""
    def post(self, request):
        is_val = request.data.get('importancia_sugerida')
        id_val = request.data.get('importancia_decisor')
        if not (is_val and id_val):
            return Response({'error': 'Se requieren importancia_sugerida e importancia_decisor'}, status=400)
        resultado = calcular_importancia_relativa(int(is_val), int(id_val))
        return Response(resultado)
