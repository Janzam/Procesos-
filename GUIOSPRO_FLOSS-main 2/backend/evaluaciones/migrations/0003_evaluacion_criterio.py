# Criterio de cálculo declarado para cada evaluación (RF-21).
# El valor por defecto marca retroactivamente las evaluaciones ya almacenadas
# como calculadas con el criterio de la tesis, sin necesidad de rellenarlas una a una.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0002_evaluacion_evaluador_evaluacion_licencia_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='evaluacion',
            name='criterio',
            field=models.CharField(
                choices=[('tesis_2022', 'Criterio de la tesis'), ('guiosad_v2', 'Criterio propuesto')],
                default='tesis_2022',
                max_length=20,
            ),
        ),
    ]
