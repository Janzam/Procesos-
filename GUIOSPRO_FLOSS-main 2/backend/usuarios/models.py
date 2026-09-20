# origen: nuevo | cambio: stub — pendiente sprint posterior
from django.db import models


class Usuario(models.Model):
    ROL_CHOICES = [
        ('decisor', 'Decisor'),
        ('admin', 'Administrador'),
    ]

    nombre = models.CharField(max_length=200)
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='decisor')
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.rol})"

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
