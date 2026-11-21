import hashlib
import json
import logging
import re
import threading
import time
from collections import deque

import anthropic
import requests
from django.conf import settings
from django.core.cache import cache

from factores.models import Factor

from .datos import prompts
from .models import Clasificacion, RespuestaIABruta
from .fuentes import prefiltrar

logger = logging.getLogger(__name__)


class RespuestaIAMalformada(ValueError):
    def __init__(self, texto, modelo, uso=None, detalle="El modelo no devolvió un objeto JSON",
                 estado="error_parseo"):
        super().__init__(detalle)
        self.texto = texto or ""
        self.modelo = modelo or ""
        self.uso = uso or {}
        self.detalle = detalle
        self.estado = estado


class GroqSinCupo(RuntimeError):
    def __init__(self, total_claves):
        super().__init__(
            f"Las {total_claves} claves de Groq agotaron su cupo diario; corrida pausada"
        )
        self.total_claves = total_claves


MODELOS_POR_DEFECTO = {
    "anthropic": "claude-opus-5-5",
    "groq": "openai/gpt-oss-120b",
    "openai": "gpt-5-mini",
    "demo": "demo-determinista",
}
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELOS_REPLAZO = ("openai/gpt-oss-120b", "openai/gpt-oss-20b")
GROQ_REINTENTOS = 5
GROQ_MARGEN_TPM = 0.85
_GROQ_USO = {}
_GROQ_AGOTADAS = {}
_GROQ_BLOQUEO = threading.Lock()


def proveedor():
    return getattr(settings, "LIT_PROVEEDOR_IA", getattr(settings, "LIT_CLASIFICADOR", "anthropic"))


def modelo_activo():
    return getattr(settings, "LIT_MODELO", "") or MODELOS_POR_DEFECTO.get(
        proveedor(), MODELOS_POR_DEFECTO["anthropic"]
    )


def _claves_groq():
    configuradas = getattr(settings, "GROQ_API_KEYS", "")
    if isinstance(configuradas, str):
        partes = configuradas.split(",")
    elif isinstance(configuradas, (list, tuple)):
        partes = list(configuradas)
    else:
        partes = []
    claves = [str(parte).strip() for parte in partes if str(parte).strip()]
    claves = list(dict.fromkeys(claves))
    if not claves:
        anterior = getattr(settings, "GROQ_API_KEY", "")
        if anterior:
            claves = [anterior]
    return claves


def _id_clave(clave):
    return hashlib.sha256(clave.encode("utf-8")).hexdigest()[:8]


def clave_configurada():
    proveedor_actual = proveedor()
    if proveedor_actual == "demo":
        return True
    if proveedor_actual == "groq":
        return bool(_claves_groq())
    if proveedor_actual == "openai":
        return bool(getattr(settings, "OPENAI_API_KEY", ""))
    return bool(getattr(settings, "ANTHROPIC_API_KEY", ""))


def _clave_agotada(key_id):
    ahora = time.monotonic()
    with _GROQ_BLOQUEO:
        hasta = _GROQ_AGOTADAS.get(key_id)
        if hasta and ahora >= hasta:
            _GROQ_AGOTADAS.pop(key_id, None)
            return False
        return bool(hasta)


def _segundos_reset(valor):
    texto = str(valor or "").strip()
    if not texto:
        return None
    if re.fullmatch(r"\d+(?:\.\d+)?", texto):
        return float(texto)
    total = 0.0
    for patron, factor in (("h", 3600), ("m", 60), ("s", 1)):
        encontrado = re.search(r"(\d+(?:\.\d+)?)\s*" + patron, texto, re.I)
        if encontrado:
            total += float(encontrado.group(1)) * factor
    return total or None


def _numero_config(nombre, defecto):
    try:
        return float(getattr(settings, nombre, defecto))
    except (TypeError, ValueError):
        return defecto


def _estimar_tokens(sistema, plantilla):
    return max(512, int((len(sistema) + len(plantilla)) / 3.5) + 350)


def _esperar_ventana_groq(estimacion, key_id):
    limite = max(1000, int(_numero_config("LIT_GROQ_TPM", 8000)))
    margen = _numero_config("LIT_GROQ_TPM_MARGEN", GROQ_MARGEN_TPM)
    presupuesto = max(1000, int(limite * margen))
    while True:
        ahora = time.monotonic()
        with _GROQ_BLOQUEO:
            hasta = _GROQ_AGOTADAS.get(key_id)
            if hasta:
                if ahora < hasta:
                    espera = hasta - ahora + 0.25
                else:
                    _GROQ_AGOTADAS.pop(key_id, None)
                    hasta = None
            if not hasta:
                uso = _GROQ_USO.setdefault(key_id, deque())
                while uso and ahora - uso[0][0] >= 60:
                    uso.popleft()
                usado = sum(tokens for _, tokens in uso)
                if not uso or usado + estimacion <= presupuesto:
                    return
                espera = 60 - (ahora - uso[0][0]) + 0.25
        time.sleep(max(0.25, espera))


def _registrar_uso_groq(cuerpo, estimacion, key_id):
    uso = cuerpo.get("usage") if isinstance(cuerpo, dict) else None
    tokens = (uso or {}).get("total_tokens", estimacion)
    try:
        tokens = int(tokens)
    except (TypeError, ValueError):
        tokens = estimacion
    with _GROQ_BLOQUEO:
        _GROQ_USO.setdefault(key_id, deque()).append((time.monotonic(), tokens))


def _retry_after_segundos(respuesta):
    cabeceras = getattr(respuesta, "headers", None) or {}
    valor = cabeceras.get("Retry-After") if hasattr(cabeceras, "get") else None
    if valor:
        try:
            return float(valor)
        except (TypeError, ValueError):
            pass
    texto = getattr(respuesta, "text", "") or ""
    encontrado = re.search(r"try again in\s+([0-9]+(?:\.[0-9]+)?)\s*s", texto, re.I)
    if encontrado:
        return float(encontrado.group(1))
    return None


def _espera_por_reintento(respuesta, intento):
    segundos = _retry_after_segundos(respuesta)
    if segundos is not None:
        return max(1.0, segundos + 0.5)
    return min(30.0, 2 ** intento)


def _es_agotamiento_diario(respuesta):
    cabeceras = getattr(respuesta, "headers", None) or {}
    if str(cabeceras.get("x-ratelimit-remaining-requests", "")).strip() == "0":
        return True
    texto = (getattr(respuesta, "text", "") or "").lower()
    if any(motivo in texto for motivo in (
        "per day", "daily", "requests per day", "tokens per day",
    )):
        return True
    segundos = _retry_after_segundos(respuesta)
    return segundos is not None and segundos >= 60


def _marcar_agotada(key_id, respuesta):
    cabeceras = getattr(respuesta, "headers", None) or {}
    segundos = _segundos_reset(cabeceras.get("x-ratelimit-reset-requests"))
    if not segundos:
        segundos = _retry_after_segundos(respuesta)
    if not segundos or segundos < 60:
        segundos = 24 * 60 * 60
    with _GROQ_BLOQUEO:
        _GROQ_AGOTADAS[key_id] = time.monotonic() + segundos
    return segundos


def _limitar_texto(texto, limite):
    texto = texto or ""
    if limite <= 0 or len(texto) <= limite:
        return texto
    return texto[:limite].rsplit(" ", 1)[0] + "…"


def _normalizar_evidencia(ids, evidencia):
    evidencia = evidencia if isinstance(evidencia, dict) else {}
    validos = {str(i) for i in ids}
    normalizada = {str(k): v for k, v in evidencia.items() if str(k) in validos}
    if not normalizada and len(ids) == 1 and len(evidencia) == 1:
        texto = next(iter(evidencia.values()))
        normalizada = {str(ids[0]): texto}
    return normalizada


def _recortar(texto, limite):
    texto = texto or ""
    return texto if len(texto) <= limite else texto[:limite] + "…"


def _tokens_uso(uso):
    if not isinstance(uso, dict):
        return ""
    return uso.get("total_tokens") or uso.get("output_tokens") or ""


def _log_respuesta(etapa, articulo, texto, uso, nivel="info"):
    mensaje = "IA %s etapa=%s articulo=%s tokens=%s contenido=%s"
    argumentos = (
        proveedor(),
        etapa,
        getattr(articulo, "huella", "?"),
        _tokens_uso(uso),
        _recortar(texto, 500),
    )
    getattr(logger, nivel)(mensaje, *argumentos)


def _guardar_respuesta_fallida(articulo, corrida, etapa, modelo, error, uso):
    RespuestaIABruta.objects.create(
        corrida=corrida,
        articulo=articulo,
        etapa=etapa,
        proveedor=proveedor(),
        modelo=modelo,
        estado=error.estado,
        texto=_recortar(error.texto, 8000),
        detalle=_recortar(error.detalle, 2000),
        uso=uso if isinstance(uso, dict) else {},
    )
    _log_respuesta(etapa, articulo, error.texto, uso, "error")
    logger.error("IA rechazada etapa=%s articulo=%s modelo=%s motivo=%s",
                 etapa, getattr(articulo, "huella", "?"), modelo, error.detalle)


def catalogo():
    """Catálogo estable de 18 factores y 61 subfactores, ordenado por id."""
    datos = cache.get("literatura:catalogo")
    if datos is None:
        datos = [
            {
                "id": f.id,
                "nombre": f.nombre,
                "subfactores": [{"id": s.id, "nombre": s.nombre} for s in f.subfactores.all()],
            }
            for f in Factor.objects.prefetch_related("subfactores").order_by("id")
        ]
        cache.set("literatura:catalogo", datos, 600)
    return datos


def parsear_json(texto):
    limpio = (texto or "").strip()
    limpio = re.sub(r"^```(?:json)?\s*|\s*```$", "", limpio)
    inicio = limpio.find("{")
    fin = limpio.rfind("}")
    if inicio < 0 or fin <= inicio:
        raise ValueError("El modelo no devolvió un objeto JSON")
    return json.loads(limpio[inicio:fin + 1])


def _llamar_anthropic(sistema, plantilla, modelo):
    clave = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not clave:
        raise RuntimeError("ANTHROPIC_API_KEY no está configurada")
    cliente = anthropic.Anthropic(api_key=clave)
    respuesta = cliente.messages.create(
        model=modelo,
        max_tokens=1200,
        temperature=0,
        system=sistema,
        messages=[{"role": "user", "content": plantilla}],
    )
    texto = "".join(bloque.text for bloque in respuesta.content if getattr(bloque, "type", "") == "text")
    uso_obj = getattr(respuesta, "usage", None)
    uso = {
        "input_tokens": getattr(uso_obj, "input_tokens", 0) or 0,
        "output_tokens": getattr(uso_obj, "output_tokens", 0) or 0,
    }
    uso["total_tokens"] = uso["input_tokens"] + uso["output_tokens"]
    try:
        crudo = parsear_json(texto)
    except ValueError as exc:
        raise RespuestaIAMalformada(texto, modelo, uso, str(exc)) from exc
    return crudo, modelo, uso


def _llamar_groq(sistema, plantilla, modelo):
    claves = _claves_groq()
    if not claves:
        raise RuntimeError("GROQ_API_KEY o GROQ_API_KEYS no está configurada")
    candidatos = [modelo] + [m for m in GROQ_MODELOS_REPLAZO if m != modelo]
    reintentos = max(1, int(_numero_config("LIT_GROQ_REINTENTOS", GROQ_REINTENTOS)))
    estimacion = _estimar_tokens(sistema, plantilla)
    indice_modelo = 0
    while indice_modelo < len(candidatos):
        modelo_intentado = candidatos[indice_modelo]
        cuerpo_peticion = {
            "model": modelo_intentado,
            "temperature": 0,
            "seed": getattr(settings, "LIT_GROQ_SEED", 42),
            "max_tokens": 2000 if "gpt-oss" in modelo_intentado else 1200,
            "messages": [
                {"role": "system", "content": sistema},
                {"role": "user", "content": plantilla},
            ],
        }
        if "gpt-oss" in modelo_intentado:
            cuerpo_peticion["reasoning_effort"] = "low"
        cambiar_modelo = False
        for clave in claves:
            key_id = _id_clave(clave)
            if _clave_agotada(key_id):
                continue
            for intento in range(reintentos):
                _esperar_ventana_groq(estimacion, key_id)
                respuesta = requests.post(
                    GROQ_URL,
                    headers={"Authorization": f"Bearer {clave}", "Content-Type": "application/json"},
                    json=cuerpo_peticion,
                    timeout=60,
                )
                if respuesta.ok:
                    cuerpo = respuesta.json()
                    _registrar_uso_groq(cuerpo, estimacion, key_id)
                    uso = cuerpo.get("usage") if isinstance(cuerpo, dict) else {}
                    try:
                        texto = cuerpo["choices"][0]["message"]["content"]
                    except (KeyError, IndexError, TypeError) as exc:
                        raise RespuestaIAMalformada(
                            "", modelo_intentado, uso,
                            "Respuesta de Groq sin contenido utilizable",
                            "error_contenido",
                        ) from exc
                    try:
                        crudo = parsear_json(texto)
                    except ValueError as exc:
                        raise RespuestaIAMalformada(
                            texto, modelo_intentado, uso, str(exc)
                        ) from exc
                    return crudo, modelo_intentado, uso
                detalle = (respuesta.text or "")[:300]
                es_modelo_inexistente = respuesta.status_code == 404 and "model_not_found" in detalle
                if es_modelo_inexistente and indice_modelo < len(candidatos) - 1:
                    cambiar_modelo = True
                    break
                if respuesta.status_code == 429:
                    if _es_agotamiento_diario(respuesta):
                        espera = _marcar_agotada(key_id, respuesta)
                        logger.warning("groq clave=%s agotada; rotando (%.0fs)", key_id, espera)
                        break
                    if intento < reintentos - 1:
                        time.sleep(_espera_por_reintento(respuesta, intento))
                        continue
                    _marcar_agotada(key_id, respuesta)
                    logger.warning("groq clave=%s sin cupo tras reintentos; rotando", key_id)
                    break
                raise RuntimeError(f"Groq devolvió {respuesta.status_code}: {detalle}")
            if cambiar_modelo:
                break
        if cambiar_modelo:
            indice_modelo += 1
            continue
        if all(_clave_agotada(_id_clave(clave)) for clave in claves):
            raise GroqSinCupo(len(claves))
        break
    raise RuntimeError("Groq no devolvió una respuesta válida")


def _llamar_openai(sistema, plantilla, modelo):
    from guiosad import openai_api

    texto, modelo_usado, uso = openai_api.chat(
        sistema, plantilla, modelo=modelo, json_mode=True, max_tokens=4000, esfuerzo="low",
    )
    try:
        crudo = parsear_json(texto)
    except ValueError as exc:
        raise RespuestaIAMalformada(texto, modelo_usado, uso, str(exc)) from exc
    return crudo, modelo_usado, uso


def _llamar_con_uso(sistema, plantilla):
    modelo = modelo_activo()
    if proveedor() == "groq":
        return _llamar_groq(sistema, plantilla, modelo)
    if proveedor() == "openai":
        return _llamar_openai(sistema, plantilla, modelo)
    return _llamar_anthropic(sistema, plantilla, modelo)


def _llamar(sistema, plantilla):
    crudo, modelo, _ = _llamar_con_uso(sistema, plantilla)
    return crudo, modelo


def _demo_relevancia(articulo):
    return {
        "floss_adopcion": prefiltrar(articulo.titulo, articulo.resumen),
        "confianza": 0.5,
        "motivo": "Clasificación determinista de demostración",
    }


def _demo_subfactores(articulo):
    texto = f"{articulo.titulo} {articulo.resumen}".lower()
    elegidos = []
    evidencia = {}
    for factor in catalogo():
        for sub in factor["subfactores"]:
            palabras = [p for p in re.findall(r"[a-záéíóúñ]+", sub["nombre"].lower()) if len(p) > 3]
            if palabras and all(p in texto for p in palabras):
                elegidos.append(sub["id"])
                evidencia[str(sub["id"])] = sub["nombre"]
    return {
        "subfactores": elegidos[:6],
        "evidencia": evidencia,
        "subfactores_extendidos": elegidos[:6],
        "evidencia_extendida": evidencia,
        "confianza": 0.5,
    }


def _salida_desde_cache(anterior):
    return {
        "crudo": anterior.crudo,
        "es_floss_adopcion": anterior.es_floss_adopcion,
        "floss_adopcion": anterior.es_floss_adopcion,
        "confianza": anterior.confianza,
        "subfactores": anterior.subfactores or [],
        "evidencia": anterior.evidencia or {},
        "subfactores_extendidos": anterior.subfactores_extendidos or [],
        "evidencia_extendida": anterior.evidencia_extendida or {},
    }


def _etapa(articulo, corrida, etapa, sistema, plantilla):
    version = prompts.version_activa(proveedor(), etapa)
    huella = f"{articulo.huella}|{etapa}|{version}"
    anterior = None
    if not getattr(corrida, "forzar_reanalisis", False):
        anterior = Clasificacion.objects.filter(huella=huella).first()
    if anterior:
        return _salida_desde_cache(anterior), True

    reintentos = max(0, int(_numero_config("LIT_REINTENTOS_PARSEO", 1)))
    uso = {}
    modelo = modelo_activo()
    crudo = None
    for intento in range(reintentos + 1):
        plantilla_actual = plantilla
        if intento:
            plantilla_actual = plantilla + (
                "\n\nREINTENTO ESTRICTO: responde únicamente con un objeto json válido "
                "entre llaves {...}. Incluye la palabra json. Sin texto adicional."
            )
        try:
            if proveedor() == "demo":
                crudo = _demo_relevancia(articulo) if etapa == "rel" else _demo_subfactores(articulo)
                uso = {}
            else:
                crudo, modelo, uso = _llamar_con_uso(sistema, plantilla_actual)
            _log_respuesta(etapa, articulo, json.dumps(crudo, ensure_ascii=False), uso)
            break
        except RespuestaIAMalformada as exc:
            modelo = exc.modelo or modelo
            _guardar_respuesta_fallida(articulo, corrida, etapa, modelo, exc, exc.uso)
            if intento >= reintentos:
                raise

    datos = {
        "articulo": articulo,
        "corrida": corrida,
        "etapa": etapa,
        "version_prompt": version,
        "modelo": modelo,
        "huella": huella,
        "crudo": crudo,
    }
    if etapa == "rel":
        datos["es_floss_adopcion"] = bool(crudo.get("floss_adopcion"))
        datos["confianza"] = float(crudo.get("confianza") or 0)
    else:
        validos = {s["id"] for f in catalogo() for s in f["subfactores"]}
        ids = [int(x) for x in crudo.get("subfactores", []) if str(x).isdigit()]
        ids_ext = [int(x) for x in crudo.get("subfactores_extendidos", []) if str(x).isdigit()]
        datos["subfactores"] = sorted(set(ids) & validos)
        datos["evidencia"] = _normalizar_evidencia(datos["subfactores"], crudo.get("evidencia"))
        ids_ext = sorted((set(ids_ext) | set(datos["subfactores"])) & validos)
        evidencia_ext = _normalizar_evidencia(ids_ext, crudo.get("evidencia_extendida"))
        for sub_id, texto in datos["evidencia"].items():
            evidencia_ext.setdefault(sub_id, texto)
        datos["subfactores_extendidos"] = ids_ext
        datos["evidencia_extendida"] = evidencia_ext
        datos["confianza"] = float(crudo.get("confianza") or 0)
    Clasificacion.objects.update_or_create(
        huella=huella,
        defaults={clave: valor for clave, valor in datos.items() if clave != "huella"},
    )
    salida = dict(datos)
    salida["floss_adopcion"] = salida.get("es_floss_adopcion")
    salida["desde_cache"] = False
    return salida, False


def clasificar(articulo, corrida, notificar=None):
    """Devuelve (relevante, ids, evidencia, desde_cache, ids_extendidos, evidencia_extendida)."""
    es_groq = proveedor() == "groq"
    limite = int(_numero_config("LIT_GROQ_RESUMEN_MAX", 1800)) if es_groq else 0
    resumen = _limitar_texto(articulo.resumen, limite)
    catalogo_actual = catalogo()
    sistema_rel = prompts.SISTEMA_RELEVANCIA_GROQ if es_groq else prompts.SISTEMA_RELEVANCIA
    plantilla_rel = prompts.PLANTILLA_RELEVANCIA.format(
        titulo=articulo.titulo, resumen=resumen, anio=articulo.anio or "?"
    )
    rel, desde_cache_rel = _etapa(articulo, corrida, "rel", sistema_rel, plantilla_rel)
    es_relevante = bool(rel.get("es_floss_adopcion"))
    if notificar:
        notificar("rel", {
            "es_relevante": es_relevante,
            "confianza": rel.get("confianza"),
            "desde_cache": desde_cache_rel,
        })
    if not es_relevante:
        return False, [], {}, int(desde_cache_rel), [], {}

    plantilla_sub = prompts.plantilla_subfactores(articulo.titulo, resumen, articulo.anio or "?")
    sistema_sub = (
        prompts.sistema_subfactores_groq(catalogo_actual) if es_groq
        else prompts.sistema_subfactores(catalogo_actual)
    )
    sub, desde_cache_sub = _etapa(articulo, corrida, "sub", sistema_sub, plantilla_sub)
    if notificar:
        notificar("sub", {
            "subfactores": list(sub.get("subfactores") or []),
            "evidencia": dict(sub.get("evidencia") or {}),
            "subfactores_extendidos": list(sub.get("subfactores_extendidos") or []),
            "evidencia_extendida": dict(sub.get("evidencia_extendida") or {}),
            "desde_cache": desde_cache_sub,
        })
    return (
        True,
        list(sub.get("subfactores") or []),
        dict(sub.get("evidencia") or {}),
        int(desde_cache_rel) + int(desde_cache_sub),
        list(sub.get("subfactores_extendidos") or []),
        dict(sub.get("evidencia_extendida") or {}),
    )
