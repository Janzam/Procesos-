# origen: guiosad.py (carga de datos desde CSV) | cambio: ninguno, ahora se lee desde DB
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Factor
from .serializers import FactorSerializer


class FactorListView(APIView):
    def get(self, request):
        factores = Factor.objects.select_related('dimension').prefetch_related('subfactores').all()
        serializer = FactorSerializer(factores, many=True)
        return Response(serializer.data)

