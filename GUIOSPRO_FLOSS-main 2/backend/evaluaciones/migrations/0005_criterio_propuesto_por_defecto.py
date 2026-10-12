# El criterio propuesto pasa a ser el predeterminado, una vez medido el contraste.
#
# Las evaluaciones ya guardadas se recalculan con el criterio nuevo. No se les
# esta reescribiendo una decision del decisor: ninguna lo eligio, todas heredaron
# el valor por defecto de la migracion 0003. Las respuestas no se tocan -solo con
# que criterio se resuelven-, de modo que el cambio es reversible: basta volver a
# poner 'tesis_2022' para recuperar exactamente el resultado anterior.

from django.db import migrations, models

ANTERIOR = 'tesis_2022'
NUEVO = 'guiosad_v2'


def adoptar_criterio_propuesto(apps, schema_editor):
    Evaluacion = apps.get_model('evaluaciones', 'Evaluacion')
    Evaluacion.objects.filter(criterio=ANTERIOR).update(criterio=NUEVO)


def volver_al_criterio_de_la_tesis(apps, schema_editor):
    Evaluacion = apps.get_model('evaluaciones', 'Evaluacion')
    Evaluacion.objects.filter(criterio=NUEVO).update(criterio=ANTERIOR)


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0004_evaluacionsubfactor_origen'),
    ]

    operations = [
        migrations.AlterField(
            model_name='evaluacion',
            name='criterio',
            field=models.CharField(
                choices=[('tesis_2022', 'Criterio de la tesis'), ('guiosad_v2', 'Criterio propuesto')],
                default='guiosad_v2',
                max_length=20,
            ),
        ),
        migrations.RunPython(adoptar_criterio_propuesto, volver_al_criterio_de_la_tesis),
    ]
