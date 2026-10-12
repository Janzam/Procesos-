# Se retira la columna que registraba con que criterio de calculo se resolvia una
# evaluacion.
#
# El sistema vuelve a tener una sola formula -la de la tesis, sin variantes-, de
# modo que la columna ya no distingue nada. Las respuestas del decisor no se tocan:
# siguen siendo lo unico que la base de datos almacena, y el resultado se deriva de
# ellas al consultarlas.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0005_criterio_propuesto_por_defecto'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='evaluacion',
            name='criterio',
        ),
    ]
