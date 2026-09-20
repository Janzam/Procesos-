# origen: guiosad.py (clase Subfactor, Factor, Dimension) | cambio: ninguno, solo serialización DRF
from rest_framework import serializers
from .models import Dimension, Factor, Subfactor


class SubfactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subfactor
        fields = ['id', 'nombre', 'orden']


class FactorSerializer(serializers.ModelSerializer):
    subfactores = SubfactorSerializer(many=True, read_only=True)
    dimension_nombre = serializers.CharField(source='dimension.nombre', read_only=True)

    class Meta:
        model = Factor
        fields = ['id', 'nombre', 'dimension', 'dimension_nombre', 'importancia_sugerida', 'alcance', 'subfactores']


class DimensionSerializer(serializers.ModelSerializer):
    factores = FactorSerializer(many=True, read_only=True)

    class Meta:
        model = Dimension
        fields = ['id', 'nombre', 'factores']
