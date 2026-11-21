"""
Vuelve a aplicar al catálogo la IS de la corrida marcada como «aplicada».

Al arrancar, el backend recarga las fixtures (fixtures/factores.json), que dejan
la importancia sugerida con los valores de la Tabla 5.3. Sin este paso, tras un
reinicio la corrida seguía marcada como aplicada pero el catálogo —y con él
todas las evaluaciones y la plantilla— volvía en silencio a los valores de la
tesis. Se ejecuta justo después de loaddata en docker-compose.yml.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from factores.models import Factor
from literatura.models import Corrida


class Command(BaseCommand):
    help = "Reaplica al catálogo la IS de la corrida activada (si la hay)."

    def handle(self, *args, **options):
        corrida = Corrida.objects.filter(activada=True).order_by("-id").first()
        if corrida is None:
            self.stdout.write("Catálogo con la IS de la Tabla 5.3 (ninguna corrida aplicada).")
            return
        cambios = 0
        with transaction.atomic():
            for resultado in corrida.resultados.select_related("factor"):
                if resultado.factor.importancia_sugerida != resultado.is_calculada:
                    Factor.objects.filter(pk=resultado.factor_id).update(
                        importancia_sugerida=resultado.is_calculada
                    )
                    cambios += 1
        self.stdout.write(
            f"Catálogo sincronizado con la corrida #{corrida.id} ({corrida.nombre}): "
            f"{cambios} factores actualizados."
        )
