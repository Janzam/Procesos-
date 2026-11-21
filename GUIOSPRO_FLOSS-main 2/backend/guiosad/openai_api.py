# Cliente minimo de la API de OpenAI (Chat Completions), compartido por el
# asistente (recomendaciones/ia.py) y la clasificacion de literatura
# (literatura/clasificador.py). Usa `requests` para no añadir dependencias.
#
# La clave se obtiene en https://platform.openai.com/api-keys y se define en
# .env como OPENAI_API_KEY. La suscripcion ChatGPT (Plus/Pro) NO incluye la API:
# hay que cargar saldo en https://platform.openai.com/settings/organization/billing
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

#
# Groq (gratis, https://console.groq.com/keys) expone la misma API, asi que
# este cliente sirve para ambos: proveedor="groq" usa GROQ_API_KEYS/GROQ_API_KEY
# y rota a la siguiente clave si una responde 401/429.
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODELO_POR_DEFECTO = "gpt-5-mini"
MODELO_GROQ_POR_DEFECTO = "openai/gpt-oss-120b"


class OpenAIError(RuntimeError):
    def __init__(self, mensaje, status=None):
        super().__init__(mensaje)
        self.status = status


def claves_groq():
    configuradas = getattr(settings, "GROQ_API_KEYS", "") or []
    if isinstance(configuradas, str):
        configuradas = configuradas.split(",")
    claves = [str(c).strip() for c in configuradas if str(c).strip()]
    if not claves and getattr(settings, "GROQ_API_KEY", ""):
        claves = [settings.GROQ_API_KEY]
    return list(dict.fromkeys(claves))


def clave(proveedor="openai"):
    if proveedor == "groq":
        claves = claves_groq()
        return claves[0] if claves else ""
    return getattr(settings, "OPENAI_API_KEY", "") or ""


def modelo_por_defecto(proveedor="openai"):
    if proveedor == "groq":
        return getattr(settings, "IA_MODELO_GROQ", "") or MODELO_GROQ_POR_DEFECTO
    return getattr(settings, "OPENAI_MODELO", "") or MODELO_POR_DEFECTO


def _es_modelo_razonador(modelo):
    # gpt-5*, o1*, o3*, o4*: no aceptan temperature y si reasoning_effort.
    # gpt-oss (Groq) acepta ambos; se le manda reasoning_effort.
    m = (modelo or "").lower()
    return m.startswith(("gpt-5", "o1", "o3", "o4", "openai/gpt-oss"))


def chat(sistema, usuario, *, modelo=None, json_mode=False, max_tokens=4000,
         esfuerzo="low", timeout=120, proveedor="openai"):
    """Una llamada a Chat Completions. Devuelve (texto, modelo, uso)."""
    if proveedor == "groq":
        claves = claves_groq()
        if not claves:
            raise OpenAIError("GROQ_API_KEY o GROQ_API_KEYS no está configurada")
        ultimo = None
        for k in claves:
            try:
                return _chat(k, GROQ_URL, sistema, usuario, modelo or modelo_por_defecto("groq"),
                             json_mode, max_tokens, esfuerzo, timeout)
            except OpenAIError as e:
                ultimo = e
                if e.status in (401, 403, 429):
                    continue  # clave sin cupo o revocada: probar la siguiente
                raise
        raise ultimo
    api_key = clave()
    if not api_key:
        raise OpenAIError("OPENAI_API_KEY no está configurada")
    return _chat(api_key, OPENAI_URL, sistema, usuario, modelo or modelo_por_defecto(),
                 json_mode, max_tokens, esfuerzo, timeout)


def _chat(api_key, url, sistema, usuario, modelo, json_mode, max_tokens, esfuerzo, timeout):

    cuerpo = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": sistema},
            {"role": "user", "content": usuario},
        ],
        "max_completion_tokens": max_tokens,
    }
    if _es_modelo_razonador(modelo):
        cuerpo["reasoning_effort"] = esfuerzo
    else:
        cuerpo["temperature"] = 0
    if json_mode:
        cuerpo["response_format"] = {"type": "json_object"}

    try:
        r = requests.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=cuerpo,
            timeout=timeout,
        )
    except requests.RequestException as e:
        logger.warning("No se pudo contactar con %s: %s", url, e)
        raise OpenAIError("No se pudo contactar con el proveedor del modelo.") from e

    if not r.ok:
        detalle = (r.text or "")[:300]
        logger.warning("%s respondio %s: %s", url, r.status_code, detalle)
        raise OpenAIError(f"El proveedor devolvió {r.status_code}: {detalle}", r.status_code)

    datos = r.json()
    uso = datos.get("usage") or {}
    try:
        eleccion = datos["choices"][0]
        texto = eleccion["message"].get("content") or ""
    except (KeyError, IndexError, TypeError) as e:
        raise OpenAIError("Respuesta de OpenAI sin contenido utilizable") from e
    if eleccion["message"].get("refusal"):
        raise OpenAIError("El modelo declinó responder a esta petición.")
    return texto, datos.get("model", modelo), uso
