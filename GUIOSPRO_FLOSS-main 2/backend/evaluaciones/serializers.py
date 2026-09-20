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


class EvaluacionCreateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=250)
    factores = EvaluacionFactorInputSerializer(many=True)


class EvaluacionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluacion
        fields = ['id', 'nombre', 'creado_en']
