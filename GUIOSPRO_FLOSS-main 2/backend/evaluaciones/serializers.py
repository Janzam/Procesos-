# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from rest_framework import serializers
from .models import Evaluacion, EvaluacionFactor, EvaluacionSubfactor


class EvaluacionSubfactorInputSerializer(serializers.Serializer):
    subfactor_id = serializers.IntegerField()
    valor = serializers.IntegerField(min_value=1, max_value=4)


class EvaluacionFactorInputSerializer(serializers.Serializer):
    factor_id = serializers.IntegerField()
    importancia_decisor = serializers.IntegerField(min_value=1, max_value=4)
    alcance_elegido = serializers.ChoiceField(choices=['Interno', 'Externo'], required=False, allow_null=True)
    subfactores = EvaluacionSubfactorInputSerializer(many=True, required=False)


# Datos del software evaluado (RF-02): opcionales y guardados por separado
CAMPOS_SOFTWARE = ['software_nombre', 'version', 'licencia',
                   'proveedor', 'organizacion', 'evaluador']


class EvaluacionCreateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=250)
    software_nombre = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    version = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    licencia = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    proveedor = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    organizacion = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    evaluador = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    factores = EvaluacionFactorInputSerializer(many=True)


class EvaluacionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluacion
        fields = ['id', 'nombre', 'creado_en', 'organizacion', 'licencia']
