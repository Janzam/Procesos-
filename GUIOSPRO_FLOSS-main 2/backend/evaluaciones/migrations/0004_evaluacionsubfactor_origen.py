# Procedencia de cada respuesta almacenada (RF-19).
# El valor por defecto marca retroactivamente las respuestas ya guardadas como
# introducidas por el decisor, sin necesidad de rellenarlas una a una.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0003_evaluacion_criterio'),
    ]

    operations = [
        migrations.AddField(
            model_name='evaluacionsubfactor',
            name='origen',
            field=models.CharField(
                choices=[
                    ('manual', 'Introducida por el decisor'),
                    ('sugerido_ia', 'Sugerencia del asistente aceptada por el decisor'),
                ],
                default='manual',
                max_length=20,
            ),
        ),
    ]
