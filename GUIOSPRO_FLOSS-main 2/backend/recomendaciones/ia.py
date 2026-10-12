# Modulo de asistencia con inteligencia artificial (RF-17, RF-18, RF-19 y RF-24).
#
# Tres condiciones delimitan lo que este modulo puede hacer. No son cautelas
# genericas: son las que preservan la validez metodologica del sistema.
#
#   1. NO PARTICIPA EN EL CALCULO. Nada de lo que hay aqui se importa desde
#      services.py. La importancia relativa, la ponderacion media, la
#      clasificacion FODA, la recomendacion, el diagnostico del resultado, las
#      respuestas determinantes y el conjunto minimo de cambios se calculan sin
#      intervencion del modelo de lenguaje. Este modulo solo lee resultados ya
#      calculados y propone o redacta.
#   2. NO DECIDE. Las valoraciones que sugiere se devuelven al cliente; ninguna
#      se almacena sin que el decisor la confirme.
#   3. DEJA RASTRO. La respuesta que se guarda registra si la introdujo el
#      decisor o si procede de una sugerencia aceptada (columna `origen`, RF-19).
#
# Si no hay credencial configurada o el proveedor falla, el sistema sigue siendo
# plenamente utilizable: el asistente es opcional (RNF-13).
import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

MODELO = "claude-opus-5-5"

# Escala de cumplimiento de la metodologia. Se le describe al modelo con el mismo
# texto que ve el decisor, para que una sugerencia signifique lo mismo que una
# respuesta manual.
ESCALA = {
    1: "No cumple el requisito",
    2: "Desconozco si cumple",
    3: "Cumple parcialmente",
    4: "Cumple el requisito",
}

CONFIANZAS = ("alta", "media", "baja")


class IANoDisponible(RuntimeError):
    """El asistente no puede usarse: sin credencial, sin SDK o el proveedor falla."""


def disponible() -> bool:
    """True si el asistente puede invocarse en esta instalacion."""
    return estado()["disponible"]


def estado() -> dict:
    """Describe al cliente si el asistente esta disponible y por que no, si no lo esta."""
    if not getattr(settings, "IA_HABILITADA", True):
        return {"disponible": False, "motivo": "El asistente esta desactivado en esta instalacion."}
    if not getattr(settings, "ANTHROPIC_API_KEY", ""):
        return {"disponible": False,
                "motivo": "No hay credencial configurada. Defina ANTHROPIC_API_KEY para activarlo."}
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return {"disponible": False,
                "motivo": "La libreria del proveedor no esta instalada en el servidor."}
    return {"disponible": True, "motivo": "", "modelo": MODELO}


def _cliente():
    if not disponible():
        raise IANoDisponible(estado()["motivo"])
    import anthropic
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _llamar(system, prompt, *, formato=None, efecto="medium", max_tokens=16000):
    """Una llamada al modelo, con los errores del proveedor traducidos a IANoDisponible."""
    import anthropic

    salida = {"effort": efecto}
    if formato is not None:
        salida["format"] = {"type": "json_schema", "schema": formato}

    try:
        respuesta = _cliente().messages.create(
            model=MODELO,
            max_tokens=max_tokens,
            system=system,
            output_config=salida,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIStatusError as e:
        logger.warning("El proveedor del modelo respondio %s: %s", e.status_code, e.message)
        raise IANoDisponible(
            f"El proveedor del modelo respondio con un error ({e.status_code})."
        ) from e
    except anthropic.APIConnectionError as e:
        logger.warning("No se pudo contactar con el proveedor del modelo: %s", e)
        raise IANoDisponible("No se pudo contactar con el proveedor del modelo.") from e

    # Una negativa del modelo no es una excepcion: llega con stop_reason 'refusal'.
    if respuesta.stop_reason == "refusal":
        raise IANoDisponible("El modelo declino responder a esta peticion.")

    texto = next((b.text for b in respuesta.content if b.type == "text"), "")
    if not texto:
        raise IANoDisponible("El modelo no devolvio contenido.")
    return texto


# ─────────────────────────────────────────────────────────────────────────────
# RF-17 · Asistente de evidencia
# ─────────────────────────────────────────────────────────────────────────────
SISTEMA_SUGERENCIAS = """Eres un asistente que ayuda a un responsable de TI a evaluar software libre
con la metodologia GUIOS. Tu trabajo es PROPONER una valoracion para cada criterio, nunca decidir:
el decisor revisa, corrige o descarta cada propuesta antes de que se guarde.

Valoras en una escala de cuatro niveles:
  1 = No cumple el requisito
  2 = Desconozco si cumple
  3 = Cumple parcialmente
  4 = Cumple el requisito

Reglas que no puedes romper:
- Responde solo sobre el producto concreto que se te indica, por su nombre y version.
- Si no tienes conocimiento suficiente sobre ese producto y ese criterio, propon 2
  («Desconozco si cumple») con confianza baja. Inventar es peor que admitir que no se sabe.
- La justificacion es una sola frase, concreta y verificable. Nada de generalidades
  sobre el software libre: habla del producto.
- La confianza refleja lo seguro que estas: «alta» solo si es un hecho conocido y estable
  del producto; «baja» si estas extrapolando.
- No menciones que eres un modelo de lenguaje ni des rodeos: solo las valoraciones."""

ESQUEMA_SUGERENCIAS = {
    "type": "object",
    "properties": {
        "valoraciones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "subfactor_id": {"type": "integer"},
                    "valor": {"type": "integer", "minimum": 1, "maximum": 4},
                    "confianza": {"type": "string", "enum": list(CONFIANZAS)},
                    "justificacion": {"type": "string"},
                },
                "required": ["subfactor_id", "valor", "confianza", "justificacion"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["valoraciones"],
    "additionalProperties": False,
}


def _describir_software(software: dict) -> str:
    campos = [
        ("Nombre", software.get("software_nombre")),
        ("Version", software.get("version")),
        ("Licencia", software.get("licencia")),
        ("Proveedor o comunidad", software.get("proveedor")),
    ]
    lineas = [f"- {etiqueta}: {valor}" for etiqueta, valor in campos if valor]
    return "\n".join(lineas) if lineas else "- (sin datos de identificacion)"


def sugerir_valoraciones(software: dict, factor_nombre: str, subfactores: list[dict]) -> list[dict]:
    """
    RF-17 · Propone una valoracion para cada subfactor de un factor.

    `subfactores` son dicts con 'id' y 'nombre'. Devuelve una lista de propuestas
    validadas; las que el modelo devuelva mal formadas o fuera de catalogo se
    descartan en silencio en vez de llegar al decisor.
    """
    if not subfactores:
        return []

    listado = "\n".join(f"{s['id']}. {s['nombre']}" for s in subfactores)
    prompt = (
        f"Software que se esta evaluando:\n{_describir_software(software)}\n\n"
        f"Factor de la metodologia: {factor_nombre}\n\n"
        f"Valora cada uno de estos criterios para ese producto. Usa el identificador "
        f"numerico tal como aparece:\n{listado}"
    )

    texto = _llamar(SISTEMA_SUGERENCIAS, prompt, formato=ESQUEMA_SUGERENCIAS, efecto="high")

    try:
        datos = json.loads(texto)
    except json.JSONDecodeError as e:
        raise IANoDisponible("La respuesta del modelo no es JSON valido.") from e

    permitidos = {s["id"] for s in subfactores}
    nombres = {s["id"]: s["nombre"] for s in subfactores}

    propuestas, vistos = [], set()
    for v in datos.get("valoraciones", []):
        sid = v.get("subfactor_id")
        valor = v.get("valor")
        # El esquema ya acota los tipos, pero la pertenencia al catalogo y la
        # ausencia de duplicados se comprueban aqui: el modelo no decide que
        # subfactores existen.
        if sid not in permitidos or sid in vistos:
            continue
        if not isinstance(valor, int) or not 1 <= valor <= 4:
            continue
        vistos.add(sid)
        propuestas.append({
            "subfactor_id": sid,
            "subfactor_nombre": nombres[sid],
            "valor": valor,
            "valor_etiqueta": ESCALA[valor],
            "confianza": v.get("confianza") if v.get("confianza") in CONFIANZAS else "baja",
            "justificacion": (v.get("justificacion") or "").strip(),
        })

    propuestas.sort(key=lambda p: p["subfactor_id"])
    return propuestas


# ─────────────────────────────────────────────────────────────────────────────
# RF-18 · Informe ejecutivo
# ─────────────────────────────────────────────────────────────────────────────
SISTEMA_INFORME = """Redactas informes ejecutivos para la direccion de una organizacion que esta
decidiendo si adopta un software libre. El analisis ya esta hecho: recibes el resultado calculado
y tu unico trabajo es expresarlo en prosa.

Reglas:
- No recalcules, no corrijas y no cuestiones el resultado. Lo que recibes es el veredicto del
  sistema; tu lo explicas.
- Cita factores concretos por su nombre. Un informe que no nombra ningun factor no sirve.
- Entre 150 y 250 palabras, en tres o cuatro parrafos, en espanol neutro.
- Tono profesional y directo, sin adjetivos de relleno ni frases hechas.
- No uses encabezados, vinetas ni markdown: parrafos corridos.
- No menciones que eres un modelo de lenguaje."""


def _resumir_factores(factores: list[dict], categorias: tuple) -> str:
    sel = [f for f in factores if f.get("foda_categoria") in categorias]
    if not sel:
        return "ninguno"
    return "; ".join(
        f"{f['factor_nombre']} ({f['dimension']}, {f['foda_categoria']}, "
        f"ponderacion {f['ponderacion_global']})"
        for f in sel
    )


def redactar_informe(software: dict, resultado: dict) -> str:
    """RF-18 · Redacta en prosa el resultado FODA y la recomendacion ya calculados."""
    factores = resultado.get("factores", [])
    rec = resultado.get("recomendacion", {})
    detalle = rec.get("detalle", {})

    prompt = (
        f"Software evaluado:\n{_describir_software(software)}\n\n"
        f"Recomendacion obtenida: {rec.get('codigo', '-')}\n"
        f"Texto oficial de esa recomendacion: {rec.get('texto', '-')}\n\n"
        f"Recuento: {detalle.get('favorables', 0)} factores favorables, "
        f"{detalle.get('desfavorables', 0)} desfavorables "
        f"({detalle.get('criticas', 0)} de ellos en factores importantes).\n\n"
        f"Fortalezas y oportunidades: {_resumir_factores(factores, ('Fortaleza', 'Oportunidad'))}\n\n"
        f"Debilidades y amenazas: {_resumir_factores(factores, ('Debilidad', 'Amenaza'))}\n\n"
        f"Redacta el informe ejecutivo."
    )
    return _llamar(SISTEMA_INFORME, prompt, efecto="medium").strip()


# ─────────────────────────────────────────────────────────────────────────────
# RF-24 · Plan de accion
# ─────────────────────────────────────────────────────────────────────────────
SISTEMA_PLAN = """Conviertes en un plan de accion el analisis que ya ha hecho un sistema de apoyo
a la decision. El sistema ha calculado, de forma determinista, que factores impiden alcanzar una
recomendacion mejor y cuanto tendria que mejorar cada uno. Tu trabajo es redactarlo como una
secuencia de acciones para el responsable de TI.

Reglas:
- No inventes factores ni cifras: usa exactamente los que recibes.
- Ordena las acciones de menor a mayor esfuerzo, y di cual es la mas barata.
- Si un factor tiene subfactores sin conocer, la primera accion sobre el es verificarlos:
  es mas barato averiguar un dato que mejorar el producto.
- Entre 120 y 200 palabras, en espanol neutro, en parrafos corridos sin vinetas ni markdown.
- Termina diciendo a que recomendacion se llegaria si se completan las acciones.
- No menciones que eres un modelo de lenguaje."""


def redactar_plan(software: dict, plan: dict) -> str:
    """RF-24 · Redacta como plan de accion el conjunto minimo de cambios ya calculado."""
    bloqueantes = plan.get("bloqueantes", [])
    if not bloqueantes:
        return ""

    detalle = "\n".join(
        f"- {b['factor_nombre']} ({b['dimension']}, importancia {b['ir_etiqueta']}, "
        f"clasificado como {b['categoria']}): ponderacion actual {b['ponderacion_actual']}, "
        f"necesita {b['ponderacion_objetivo']}. "
        + (f"Habria que elevar {b['subfactores_a_mejorar']} de sus {b['subfactores_totales']} criterios."
           if b.get("subfactores_a_mejorar") is not None
           else "No alcanza el umbral ni con todos sus criterios al maximo.")
        + (f" Tiene {b['subfactores_sin_conocer']} criterios sin conocer."
           if b.get("subfactores_sin_conocer") else "")
        for b in bloqueantes
    )

    prompt = (
        f"Software evaluado:\n{_describir_software(software)}\n\n"
        f"Recomendacion actual: {plan.get('recomendacion_actual', '-')}\n"
        f"Recomendacion que se alcanzaria resolviendo todo: {plan.get('objetivo') or 'no determinada'}\n\n"
        f"Factores que lo impiden:\n{detalle}\n\n"
        f"Redacta el plan de accion."
    )
    return _llamar(SISTEMA_PLAN, prompt, efecto="medium").strip()
