from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0006_retirar_criterio'),
    ]

    operations = [
        migrations.AddField(
            model_name='evaluacion', name='informe_ia',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='evaluacion', name='informe_modelo',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='evaluacion', name='informe_firma',
            field=models.CharField(blank=True, default='', max_length=40),
        ),
        migrations.AddField(
            model_name='evaluacion', name='informe_fecha',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='evaluacion', name='plan_ia',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='evaluacion', name='plan_firma',
            field=models.CharField(blank=True, default='', max_length=40),
        ),
    ]
