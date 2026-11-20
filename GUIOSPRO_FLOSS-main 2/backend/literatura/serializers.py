from rest_framework import serializers

from .models import Corrida, EventoProgreso, ResultadoFactor


class EventoProgresoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoProgreso
        fields = ["id", "nivel", "fase", "mensaje", "datos", "creado_en"]


class ResultadoFactorSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="factor.nombre", read_only=True)
    dimension = serializers.CharField(source="factor.dimension.nombre", read_only=True)

    class Meta:
        model = ResultadoFactor
        fields = [
            "id", "factor", "nombre", "dimension", "ns", "tc_unicos", "tc_menciones",
            "tc", "r", "il", "is_calculada", "il_tesis", "is_tesis", "diff_il", "diff_is",
            "articulos",
        ]


class CorridaSerializer(serializers.ModelSerializer):
    resultados = ResultadoFactorSerializer(many=True, read_only=True)
    rango = serializers.CharField(read_only=True)
    duracion_segundos = serializers.SerializerMethodField()

    class Meta:
        model = Corrida
        fields = [
            "id", "nombre", "anio_inicio", "anio_fin", "rango", "fuentes", "metodo_tc",
            "max_articulos", "forzar_reanalisis", "modelo_ia", "version_prompt", "hash_config", "estado", "fase", "progreso",
            "mensaje", "total_articulos", "total_relevantes", "total_clasificados",
            "total_desde_cache", "total_omitidos", "cortes", "metricas", "hash_resultado",
            "es_reproduccion",
            "activada", "creada_en", "iniciada_en", "terminada_en", "duracion_segundos",
            "resultados",
        ]

    def get_duracion_segundos(self, obj):
        if not obj.iniciada_en:
            return None
        fin = obj.terminada_en
        return round((fin - obj.iniciada_en).total_seconds(), 1) if fin else None


class CorridaResumenSerializer(serializers.ModelSerializer):
    rango = serializers.CharField(read_only=True)

    class Meta:
        model = Corrida
        fields = [
            "id", "nombre", "rango", "fuentes", "metodo_tc", "max_articulos", "forzar_reanalisis", "estado", "fase", "progreso",
            "total_omitidos", "es_reproduccion", "activada", "creada_en", "terminada_en",
            "hash_resultado",
        ]
