from django.conf import settings
from django.db import models

from factores.models import Factor


class Corrida(models.Model):
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("ejecutando", "Ejecutando"),
        ("pausada", "Pausada"),
        ("listo", "Listo"),
        ("error", "Error"),
    ]

    nombre = models.CharField(max_length=120)
    anio_inicio = models.IntegerField()
    anio_fin = models.IntegerField()
    fuentes = models.JSONField(default=list)
    metodo_tc = models.CharField(max_length=20, default="menciones")
    max_articulos = models.PositiveIntegerField(default=0)
    forzar_reanalisis = models.BooleanField(default=False)
    modelo_ia = models.CharField(max_length=80)
    version_prompt = models.CharField(max_length=40)
    hash_config = models.CharField(max_length=64, db_index=True)

    estado = models.CharField(max_length=20, default="pendiente")
    fase = models.CharField(max_length=60, default="Inicializando")
    progreso = models.IntegerField(default=0)
    mensaje = models.TextField(blank=True)
    total_articulos = models.IntegerField(default=0)
    total_relevantes = models.IntegerField(default=0)
    total_clasificados = models.IntegerField(default=0)
    total_desde_cache = models.IntegerField(default=0)
    total_omitidos = models.PositiveIntegerField(default=0)

    cortes = models.JSONField(default=list)
    metricas = models.JSONField(default=dict)
    hash_resultado = models.CharField(max_length=64, blank=True)
    es_reproduccion = models.BooleanField(default=False)
    activada = models.BooleanField(default=False)
    is_anterior = models.JSONField(default=dict)

    creada_en = models.DateTimeField(auto_now_add=True)
    iniciada_en = models.DateTimeField(null=True, blank=True)
    terminada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-creada_en"]

    def __str__(self):
        return f"{self.nombre} ({self.anio_inicio}-{self.anio_fin})"

    @property
    def rango(self):
        return f"{self.anio_inicio}-{self.anio_fin}"


class Articulo(models.Model):
    huella = models.CharField(max_length=64, unique=True)
    doi = models.CharField(max_length=255, blank=True, db_index=True)
    titulo = models.TextField()
    resumen = models.TextField(blank=True)
    revista = models.CharField(max_length=255, blank=True)
    anio = models.IntegerField(null=True, blank=True)
    fuente = models.CharField(max_length=40)
    url = models.URLField(max_length=500, blank=True)
    datos_crudos = models.JSONField(default=dict)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo[:120]


class Clasificacion(models.Model):
    ETAPAS = [("rel", "Relevancia"), ("sub", "Subfactores")]

    articulo = models.ForeignKey(Articulo, on_delete=models.CASCADE, related_name="clasificaciones")
    corrida = models.ForeignKey(Corrida, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="clasificaciones")
    etapa = models.CharField(max_length=4, choices=ETAPAS)
    version_prompt = models.CharField(max_length=40)
    modelo = models.CharField(max_length=80)
    huella = models.CharField(max_length=140, unique=True)
    es_floss_adopcion = models.BooleanField(null=True, blank=True)
    confianza = models.FloatField(null=True, blank=True)
    subfactores = models.JSONField(default=list)
    evidencia = models.JSONField(default=dict)
    subfactores_extendidos = models.JSONField(default=list)
    evidencia_extendida = models.JSONField(default=dict)
    crudo = models.JSONField(default=dict)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"{self.articulo_id}:{self.etapa}:{self.version_prompt}"


class RespuestaIABruta(models.Model):
    ESTADOS = [
        ("error_parseo", "Error de parseo"),
        ("error_contenido", "Sin contenido utilizable"),
    ]

    corrida = models.ForeignKey(Corrida, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name="respuestas_brutas")
    articulo = models.ForeignKey(Articulo, on_delete=models.CASCADE, related_name="respuestas_brutas")
    etapa = models.CharField(max_length=4, choices=Clasificacion.ETAPAS)
    proveedor = models.CharField(max_length=20)
    modelo = models.CharField(max_length=80)
    estado = models.CharField(max_length=20, choices=ESTADOS)
    texto = models.TextField(blank=True)
    detalle = models.TextField(blank=True)
    uso = models.JSONField(default=dict)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado_en"]

    def __str__(self):
        return f"[{self.estado}] {self.articulo_id}:{self.etapa}:{self.modelo}"


class ResultadoFactor(models.Model):
    corrida = models.ForeignKey(Corrida, on_delete=models.CASCADE, related_name="resultados")
    factor = models.ForeignKey(Factor, on_delete=models.PROTECT, related_name="resultados_literatura")
    ns = models.IntegerField()
    tc_unicos = models.IntegerField(default=0)
    tc_menciones = models.IntegerField(default=0)
    tc = models.IntegerField(default=0)
    r = models.FloatField(default=0)
    il = models.IntegerField(default=0)
    is_calculada = models.IntegerField(default=0)
    il_tesis = models.IntegerField(default=0)
    is_tesis = models.IntegerField(default=0)
    diff_il = models.IntegerField(default=0)
    diff_is = models.IntegerField(default=0)
    articulos = models.JSONField(default=list)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["corrida", "factor"], name="unico_factor_por_corrida")]
        ordering = ["factor__id"]

    def __str__(self):
        return f"{self.corrida_id}:{self.factor.nombre}"


class EventoProgreso(models.Model):
    NIVELES = [("info", "Info"), ("ok", "Correcto"), ("aviso", "Aviso"), ("error", "Error")]

    corrida = models.ForeignKey(Corrida, on_delete=models.CASCADE, related_name="eventos")
    nivel = models.CharField(max_length=10, choices=NIVELES, default="info")
    fase = models.CharField(max_length=60)
    mensaje = models.TextField()
    datos = models.JSONField(default=dict)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"[{self.fase}] {self.mensaje[:80]}"
