# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from rest_framework import serializers
from .models import Evaluacion, EvaluacionSubfactor


class DatosSoftwareSerializer(serializers.Serializer):
    """
    Datos del software evaluado (RF-02). Todos opcionales. Los comparten la
    creación/edición de evaluaciones y la petición de sugerencias al asistente,
    de modo que los límites de cada campo se declaran una sola vez.
    """
    software_nombre = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    version = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    licencia = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    proveedor = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    organizacion = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    evaluador = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


class EvaluacionSubfactorInputSerializer(serializers.Serializer):
    subfactor_id = serializers.IntegerField()
    valor = serializers.IntegerField(min_value=1, max_value=4)
    # RF-19: lo declara el cliente al confirmar una sugerencia del asistente.
    origen = serializers.ChoiceField(
        choices=[c[0] for c in EvaluacionSubfactor.ORIGEN_CHOICES],
        required=False, default='manual',
    )


class EvaluacionFactorInputSerializer(serializers.Serializer):
    factor_id = serializers.IntegerField()
    importancia_decisor = serializers.IntegerField(min_value=1, max_value=4)
    alcance_elegido = serializers.ChoiceField(choices=['Interno', 'Externo'], required=False, allow_null=True)
    subfactores = EvaluacionSubfactorInputSerializer(many=True, required=False)


class EvaluacionCreateSerializer(DatosSoftwareSerializer):
    nombre = serializers.CharField(max_length=250)
    factores = EvaluacionFactorInputSerializer(many=True)


class EvaluacionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluacion
        fields = ['id', 'nombre', 'creado_en', 'organizacion', 'licencia']
