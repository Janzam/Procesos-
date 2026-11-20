from django.contrib import admin

from .models import Articulo, Clasificacion, Corrida, EventoProgreso, ResultadoFactor


@admin.register(Corrida)
class CorridaAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "rango", "estado", "metodo_tc", "es_reproduccion", "activada", "creada_en")
    list_filter = ("estado", "metodo_tc", "es_reproduccion", "activada")


@admin.register(Articulo)
class ArticuloAdmin(admin.ModelAdmin):
    list_display = ("id", "anio", "fuente", "doi", "titulo")
    search_fields = ("titulo", "doi")


@admin.register(Clasificacion)
class ClasificacionAdmin(admin.ModelAdmin):
    list_display = ("id", "articulo", "etapa", "es_floss_adopcion", "version_prompt")


@admin.register(ResultadoFactor)
class ResultadoFactorAdmin(admin.ModelAdmin):
    list_display = ("corrida", "factor", "tc", "ns", "r", "il", "is_calculada")


admin.site.register(EventoProgreso)
