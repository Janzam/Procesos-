# origen: nuevo | cambio: no existía en el sistema original (persistencia de evaluaciones)
from django.db import models
from factores.models import Factor, Subfactor

# Datos del software evaluado (RF-02): opcionales y guardados por separado.
# Es la única lista de esos campos; serializadores y vistas la reutilizan.
CAMPOS_SOFTWARE = ['software_nombre', 'version', 'licencia',
                   'proveedor', 'organizacion', 'evaluador']


class Evaluacion(models.Model):
    # Nombre para mostrar; se compone a partir de los datos del software
    nombre = models.CharField(max_length=250)
    creado_en = models.DateTimeField(auto_now_add=True)

    # Datos del software evaluado (RF-02). Todos opcionales: el decisor puede
    # evaluar sin identificarlos. Se guardan por separado, y no solo fundidos
    # en 'nombre', para poder consultarlos y filtrar por ellos en el historial.
    software_nombre = models.CharField(max_length=200, blank=True, default='')
    version = models.CharField(max_length=50, blank=True, default='')
    licencia = models.CharField(max_length=100, blank=True, default='')
    proveedor = models.CharField(max_length=200, blank=True, default='')
    organizacion = models.CharField(max_length=200, blank=True, default='')
    evaluador = models.CharField(max_length=200, blank=True, default='')

    def __str__(self):
        return f"{self.nombre} ({self.creado_en:%Y-%m-%d})"

    def datos_software(self) -> dict:
        """Los campos de identificación del software, tal como los consume la API y el asistente."""
        return {c: getattr(self, c) for c in CAMPOS_SOFTWARE}

    class Meta:
        ordering = ['-creado_en']
        verbose_name = "Evaluación"
        verbose_name_plural = "Evaluaciones"


class EvaluacionFactor(models.Model):
    ALCANCE_CHOICES = [
        ('Interno', 'Interno'),
        ('Externo', 'Externo'),
    ]

    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name='factores_eval')
    factor = models.ForeignKey(Factor, on_delete=models.CASCADE)
    importancia_decisor = models.IntegerField()  # 1-4, slider del decisor en Paso 1-2
    # Para factores con alcance='Ambos', el decisor elige Interno o Externo
    alcance_elegido = models.CharField(max_length=10, choices=ALCANCE_CHOICES, null=True, blank=True)

    class Meta:
        unique_together = ('evaluacion', 'factor')


class EvaluacionSubfactor(models.Model):
    # Procedencia de la respuesta (RF-19). El asistente con IA no almacena nada por
    # su cuenta: el decisor confirma cada sugerencia y entonces se guarda marcada
    # como tal, de modo que cualquier evaluacion puede auditarse despues.
    ORIGEN_CHOICES = [
        ('manual', 'Introducida por el decisor'),
        ('sugerido_ia', 'Sugerencia del asistente aceptada por el decisor'),
    ]

    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name='subfactores_eval')
    subfactor = models.ForeignKey(Subfactor, on_delete=models.CASCADE)
    valor = models.IntegerField()  # 1-4, slider del decisor en Paso 3-4
    origen = models.CharField(max_length=20, choices=ORIGEN_CHOICES, default='manual')

    class Meta:
        unique_together = ('evaluacion', 'subfactor')
