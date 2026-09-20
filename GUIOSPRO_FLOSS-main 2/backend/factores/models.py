# origen: guiosad.py (clases Dimension, Factor, Subfactor) | cambio: ninguno, solo se movió a modelos Django
from django.db import models


class Dimension(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Dimensión"
        verbose_name_plural = "Dimensiones"
        ordering = ['id']


class Factor(models.Model):
    ALCANCE_CHOICES = [
        ('Interno', 'Interno'),
        ('Externo', 'Externo'),
        ('Ambos', 'Ambos'),
    ]

    nombre = models.CharField(max_length=250, unique=True)
    dimension = models.ForeignKey(Dimension, on_delete=models.CASCADE, related_name='factores')
    importancia_sugerida = models.IntegerField()  # 1-4, viene de factors.csv columna "Sugerida"
    alcance = models.CharField(max_length=10, choices=ALCANCE_CHOICES)

    def __str__(self):
        return self.nombre

    class Meta:
        ordering = ['id']


class Subfactor(models.Model):
    nombre = models.TextField()
    factor = models.ForeignKey(Factor, on_delete=models.CASCADE, related_name='subfactores')
    orden = models.IntegerField(default=0)

    def __str__(self):
        return self.nombre[:80]

    class Meta:
        ordering = ['factor', 'orden']
