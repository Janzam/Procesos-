from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("literatura", "0005_corrida_forzar_reanalisis"),
    ]

    operations = [
        migrations.AddField(
            model_name="clasificacion",
            name="subfactores_extendidos",
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name="clasificacion",
            name="evidencia_extendida",
            field=models.JSONField(default=dict),
        ),
    ]
