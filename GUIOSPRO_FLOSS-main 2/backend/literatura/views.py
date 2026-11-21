from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import clasificador, fuentes, pipeline
from .datos import prompts
from .datos.tabla_5_3 import TABLA_5_3, IE_TESIS
from .models import Corrida
from .serializers import CorridaResumenSerializer, CorridaSerializer, EventoProgresoSerializer


class ConfigView(APIView):
    def get(self, request):
        return Response({
            "anio_actual": timezone.now().year,
            "anios_sugeridos": [[2008, 2019], [2020, 2025]],
            "fuentes": fuentes.FUENTES_DISPONIBLES,
            "fuentes_configuradas": fuentes.configuradas(),
            "metodos_tc": [
                {"id": "menciones", "label": "Menciones por subfactor (tesis)",
                 "detalle": "Un artículo cuenta una vez por cada subfactor que sustente. Es la interpretación de la tesis."},
                {"id": "unicos", "label": "Artículos únicos por factor (sensibilidad)",
                 "detalle": "Cada artículo cuenta una vez por factor, aunque sustente varios subfactores."},
            ],
            "metodo_tc_actual": getattr(settings, "LIT_METODO_TC", "menciones"),
            "max_articulos_actual": max(0, int(getattr(settings, "LIT_MAX_ARTICULOS", 0) or 0)),
            "modelo": clasificador.modelo_activo(),
            "proveedor_ia": clasificador.proveedor(),
            "ia_configurada": clasificador.clave_configurada(),
            "version_prompt": prompts.version_activa(clasificador.proveedor()),
            "ie_tesis": IE_TESIS,
            "referencia": TABLA_5_3,
            "nota": "El modo demo-determinista es solo para probar el flujo; no genera resultados válidos.",
        })


class CorridaListaView(APIView):
    def get(self, request):
        corridas = Corrida.objects.all()[:30]
        return Response(CorridaResumenSerializer(corridas, many=True).data)

    def post(self, request):
        datos = request.data or {}
        try:
            inicio = int(datos.get("anio_inicio", 2020))
            fin = int(datos.get("anio_fin", 2025))
        except (TypeError, ValueError):
            return Response({"detail": "Los años deben ser números enteros"}, status=status.HTTP_400_BAD_REQUEST)
        fuentes_elegidas = datos.get("fuentes") or ["openalex"]
        metodo = datos.get("metodo_tc") or getattr(settings, "LIT_METODO_TC", "menciones")
        try:
            max_articulos = int(datos.get(
                "max_articulos", getattr(settings, "LIT_MAX_ARTICULOS", 0) or 0,
            ) or 0)
        except (TypeError, ValueError):
            return Response({"detail": "max_articulos debe ser un número entero"}, status=status.HTTP_400_BAD_REQUEST)
        forzar_reanalisis = str(datos.get("forzar_reanalisis", False)).lower() in ("1", "true", "yes")

        anio_actual = timezone.now().year
        if inicio < 1990 or fin > anio_actual or inicio > fin:
            return Response(
                {"detail": f"Rango de años no válido: debe ir de 1990 a {anio_actual} y «Desde» no puede ser mayor que «Hasta»."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        nombre = str(datos.get("nombre") or "").strip() or f"Literatura {inicio}-{fin}"
        if len(nombre) > 120:
            return Response({"detail": "El nombre de la corrida admite como máximo 120 caracteres."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(fuentes_elegidas, list) or not fuentes_elegidas:
            return Response({"detail": "Selecciona al menos una fuente"}, status=status.HTTP_400_BAD_REQUEST)
        desconocidas = [f for f in fuentes_elegidas if f not in fuentes.FUENTES_DISPONIBLES]
        if desconocidas:
            return Response({"detail": f"Fuentes no soportadas: {', '.join(desconocidas)}"},
                            status=status.HTTP_400_BAD_REQUEST)
        if metodo not in ("unicos", "menciones"):
            return Response({"detail": "metodo_tc no válido"}, status=status.HTTP_400_BAD_REQUEST)
        if max_articulos < 0 or max_articulos > 10000:
            return Response({"detail": "max_articulos debe estar entre 0 y 10000"}, status=status.HTTP_400_BAD_REQUEST)

        corrida = Corrida.objects.create(
            nombre=nombre,
            anio_inicio=inicio,
            anio_fin=fin,
            fuentes=fuentes_elegidas,
            metodo_tc=metodo,
            max_articulos=max_articulos,
            forzar_reanalisis=forzar_reanalisis,
            modelo_ia=clasificador.modelo_activo(),
            version_prompt=prompts.version_activa(clasificador.proveedor()),
        )
        pipeline.iniciar_en_hilo(corrida)
        return Response(CorridaSerializer(corrida).data, status=status.HTTP_202_ACCEPTED)


class CorridaDetalleView(APIView):
    def get(self, request, pk):
        corrida = Corrida.objects.filter(pk=pk).first()
        if not corrida:
            return Response({"detail": "Corrida no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        return Response(CorridaSerializer(corrida).data)

    def delete(self, request, pk):
        corrida = Corrida.objects.filter(pk=pk).first()
        if not corrida:
            return Response({"detail": "Corrida no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        if corrida.estado in ("pendiente", "ejecutando"):
            return Response(
                {"detail": "No se puede eliminar una corrida en curso. Espera a que termine o déjala en pausa."},
                status=status.HTTP_409_CONFLICT,
            )
        with transaction.atomic():
            if corrida.activada:
                pipeline.restablecer_catalogo_tesis()
            corrida.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReanudarView(APIView):
    def post(self, request, pk):
        corrida = Corrida.objects.filter(pk=pk).first()
        if not corrida:
            return Response({"detail": "Corrida no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        if corrida.estado != "pausada":
            return Response(
                {"detail": "Solo se puede reanudar una corrida pausada"},
                status=status.HTTP_409_CONFLICT,
            )
        pipeline.reanudar(corrida)
        return Response(CorridaSerializer(corrida).data, status=status.HTTP_202_ACCEPTED)


class ProgresoView(APIView):
    def get(self, request, pk):
        corrida = Corrida.objects.filter(pk=pk).first()
        if not corrida:
            return Response({"detail": "Corrida no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        desde = request.query_params.get("desde")
        eventos = corrida.eventos.all()
        if desde and str(desde).isdigit():
            eventos = eventos.filter(id__gt=int(desde))
        return Response({
            "id": corrida.id,
            "estado": corrida.estado,
            "fase": corrida.fase,
            "progreso": corrida.progreso,
            "mensaje": corrida.mensaje,
            "total_articulos": corrida.total_articulos,
            "max_articulos": corrida.max_articulos,
            "forzar_reanalisis": corrida.forzar_reanalisis,
            "total_relevantes": corrida.total_relevantes,
            "total_clasificados": corrida.total_clasificados,
            "total_desde_cache": corrida.total_desde_cache,
            "total_omitidos": corrida.total_omitidos,
            "eventos": EventoProgresoSerializer(eventos, many=True).data,
        })


class ActivarView(APIView):
    def post(self, request, pk):
        corrida = Corrida.objects.filter(pk=pk).first()
        if not corrida:
            return Response({"detail": "Corrida no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        accion = (request.data or {}).get("accion", "activar")
        try:
            if accion == "desactivar":
                pipeline.desactivar(corrida)
            else:
                pipeline.activar(corrida)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CorridaSerializer(corrida).data)


class CompararView(APIView):
    def get(self, request, pk):
        corrida = Corrida.objects.filter(pk=pk).first()
        if not corrida:
            return Response({"detail": "Corrida no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "corrida": corrida.id,
            "rango": corrida.rango,
            "metodo_tc": corrida.metodo_tc,
            "metricas": corrida.metricas,
            "resultados": [
                {
                    "factor": r.factor.nombre,
                    "tc": r.tc,
                    "il": r.il,
                    "il_tesis": r.il_tesis,
                    "is": r.is_calculada,
                    "is_tesis": r.is_tesis,
                }
                for r in corrida.resultados.select_related("factor")
            ],
        })
