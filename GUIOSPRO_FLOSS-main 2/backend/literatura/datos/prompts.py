import json

VERSION = "lit-v1-2026-11-16"
VERSION_SUB_GROQ = "lit-v1-2026-11-25"

FACTORES_EN = {
    1: "Technological compatibility",
    2: "Technological customization",
    3: "Technological testing",
    4: "Technological reliability",
    5: "Technological reusability",
    6: "Technological usability",
    7: "Technological maintainability",
    8: "Technological portability",
    9: "Documentation",
    10: "Organizational training",
    11: "Adoption time",
    12: "FLOSS adoption case studies",
    13: "Centrality of information technology",
    14: "Top management support",
    15: "Vendor lock-in",
    16: "Support",
    17: "Attitude toward change",
    18: "Total cost of ownership",
}

SUBFACTORES_EN = {
    1: "cloud infrastructure provided by a company",
    2: "exports proprietary formats",
    3: "integrates with existing proprietary software",
    4: "certified for its market niche",
    5: "fits common use cases and features",
    6: "compatible with multiple hardware components",
    7: "uses standard formats",
    8: "runs on multiple operating systems",
    9: "source-code access incentivizes the organization",
    10: "source code can be easily extended",
    11: "rapid innovation pace",
    12: "easy customization without changing source code",
    13: "new features through modules",
    14: "public repository of extensions",
    15: "easy to deploy and test",
    16: "reliable and stable",
    17: "good security bug history",
    18: "more flexible than the proprietary alternative",
    19: "more dependable than the proprietary alternative",
    20: "many access-control features",
    21: "license permits proprietary extensions",
    22: "offered as a library or framework",
    23: "has a graphical user interface",
    24: "easier to use than the proprietary alternative",
    25: "easy to learn",
    26: "users dissatisfied with proprietary software",
    27: "actively maintained by developers",
    28: "mobile app version available",
    29: "standalone database management system",
    30: "well documented",
    31: "development docs cover all features",
    32: "documentation in multiple formats",
    33: "documentation is easy to understand",
    34: "documentation is up to date",
    35: "documentation written by professional writers",
    36: "high-quality documentation",
    37: "includes developer documentation",
    38: "includes user documentation",
    39: "user docs cover all features",
    40: "data formats are well documented",
    41: "adoption improves users' technical IT skills",
    42: "staff can self-learn the software",
    43: "staff trained to solve technical problems",
    44: "training plans are available",
    45: "installation requirements are easy to meet",
    46: "low adoption time",
    47: "public reports describe successful adoption",
    48: "adoption improves users' work environment",
    49: "centralized IT infrastructure speeds adoption",
    50: "top management supports adoption",
    51: "reduces vendor dependencies",
    52: "community support is available",
    53: "expert or consultant support is available",
    54: "commercial support available 24/7",
    55: "in-house developers know the software",
    56: "commercial support for customization",
    57: "easy to hire IT staff who know it",
    58: "staff show little resistance to change",
    59: "technical deployment or support staff back adoption",
    60: "few hidden adoption costs",
    61: "cheaper than the proprietary alternative",
}


def catalogo_ingles(catalogo):
    lineas = []
    for factor in catalogo:
        nombre = FACTORES_EN.get(factor["id"], factor["nombre"])
        subfactores = "; ".join(
            f"[{sub['id']}] {SUBFACTORES_EN.get(sub['id'], sub['nombre'])}"
            for sub in factor["subfactores"]
        )
        lineas.append(f"- [{factor['id']}] {nombre}: {subfactores}")
    return "\n".join(lineas)


EQUIVALENCIAS_SUB = """EQUIVALENCIAS PERMITIDAS (afirmaciones sobre FLOSS o comparaciones que motivan su adopción; la frase debe estar en el texto):
- cost saving, financial benefits, cheaper, no procurement costs, reduced licensing fees, financial or human-capital constraints motivating FLOSS -> 61; hidden or unforeseen costs -> 60.
- autonomy, independence, control over the software, vendor lock-in, reduced or avoided vendor dependence, dependence on proprietary suppliers mentioned as a reason to adopt FLOSS -> 51.
- community support, free online support, forums, mailing lists -> 52; community development alone -> none; commercial support for FLOSS -> 54/56.
- training, upgrading skills, self-learning, technical competencies, recommended or important training when it favors FLOSS adoption -> 41/42/43/44.
- support, governmental or institutional support, top management support described as important, paramount, recommended or actually received when it favors FLOSS adoption -> 50/52/56 according to the exact meaning.
- lack of support, documentation or training in proprietary tools, low quality, risk or failure of proprietary options when explicitly contrasted with FLOSS -> 52/56/9/41/17/4/16; a bare defect with no FLOSS adoption context -> none.
- reliable, stable, security, integration with existing systems, standard formats -> 16/17/3/7.
- explicit short adoption or implementation time, rapid diffusion or successful implementations mentioned as evidence of adoption -> 46/47.
"""

REGLAS_DUALES = """Devuelve DOS CAPAS en el mismo JSON:
- "subfactores" y "evidencia": CAPA ESTRICTA. Solo las afirmaciones positivas sobre FLOSS ya descritas.
- "subfactores_extendidos" y "evidencia_extendida": CAPA EXTENDIDA. DEBE incluir TODOS los IDs de "subfactores" y puede añadir menciones indirectas o comparativas que expliquen por qué se adoptó FLOSS, siempre con frase literal del texto. Nunca devuelvas una capa extendida que sea subconjunto de la estricta: si no hay ID nuevos, copia exactamente la capa estricta.
"evidencia_extendida" debe contener una frase para cada ID estricto y para cada ID nuevo. Las claves de ambas evidencias deben ser los IDs exactos de su capa. No incluyas frases genéricas ni contradicciones.
"""

EQUIVALENCIAS_EXTENDIDAS = """EQUIVALENCIAS ADICIONALES SOLO PARA LA CAPA EXTENDIDA:
- total cost of ownership over time, avoided maintenance or upgrade effort, lower hidden costs -> 60/61 when linked to FLOSS adoption.
- indirect benefits of FLOSS adoption such as local capacity, standardization or reduced dependence -> the matching factor when the text links them to FLOSS.
"""


SISTEMA_RELEVANCIA = """
Eres un asistente de revisión sistemática de literatura sobre adopción de software libre y de código abierto (FLOSS: free/libre/open source software).

Decide si el artículo TRATA DE la adopción de FLOSS, no solo si menciona la palabra "open source".

Responde SOLO con un objeto JSON válido, sin texto antes ni después, con esta forma exacta:
{"floss_adopcion": true, "confianza": 0.0, "motivo": "frase corta"}

Reglas:
- floss_adopcion=true solo si el título o el resumen describe adopción, migración, implementación, uso organizacional o decisión de adoptar FLOSS.
- floss_adopcion=false si el tema es otro (por ejemplo, seguridad de un paquete aislado, licencias sin adopción, desarrolladores contribuyendo sin contexto organizacional).
- confianza es un número entre 0 y 1 con dos decimales.
- motivo tiene menos de 120 caracteres.
- No inventes datos. No expliques el razonamiento."""

PLANTILLA_RELEVANCIA = """TÍTULO: {titulo}
RESUMEN: {resumen}
AÑO: {anio}

¿Trata de adopción de FLOSS? Devuelve solo el JSON."""

SISTEMA_RELEVANCIA_GROQ = """Decide si el texto describe adopción, migración, implementación o uso organizacional de FLOSS.
JSON exacto: {"floss_adopcion": true, "confianza": 0.0, "motivo": "frase corta"}
true solo con adopción real; false si solo menciona open source, licencias o desarrollo sin contexto organizacional.
confianza entre 0 y 1; motivo menor a 120 caracteres. Sin explicaciones."""


def version_activa(proveedor="anthropic", etapa="rel"):
    if proveedor == "groq" and etapa == "sub":
        return VERSION_SUB_GROQ + "-groq-lite"
    return VERSION + ("-groq-lite" if proveedor == "groq" else "")


def sistema_subfactores(catalogo):
    """`catalogo`: lista de {"id", "nombre", "subfactores": [{"id", "nombre"}]}."""
    return """Eres un codificador de literatura para la metodología GUIOS (Rea Sánchez, 2022).
Tu única tarea es marcar qué subfactores del catálogo están SUSTANCIADOS en el título y el resumen de un artículo sobre adopción de FLOSS.

Responde SOLO con un objeto JSON válido, sin texto antes ni después:
{"subfactores": [1, 2], "evidencia": {"1": "frase literal del resumen", "2": "frase literal del resumen"}, "subfactores_extendidos": [1, 2, 9], "evidencia_extendida": {"1": "frase literal del resumen", "2": "frase literal del resumen", "9": "frase literal del resumen"}, "confianza": 0.0}

Reglas estrictas:
- Usa SOLO identificadores numéricos que aparezcan en el catálogo. Nunca inventes IDs.
- Marca un subfactor si el texto afirma claramente la misma idea, aunque use otras palabras (equivalencia semántica explícita). No deduzcas de contexto general ni de lo que suele ocurrir.
- En la CAPA ESTRICTA cuenta afirmaciones positivas sobre FLOSS y también carencias del software propietario cuando el texto las usa explícitamente para explicar la adopción de FLOSS. No marques carencias de FLOSS ("lack of", "without", "low", "immature", "failure" aplicados a FLOSS) ni frases que expliquen por qué se eligió propietario.
- Si el texto solo nombra el factor de forma genérica, no marques ningún subfactor de ese factor.
- Como máximo 6 subfactores por capa. Si hay más candidatos, elige los 6 con evidencia más explícita.
- Cada "evidencia" debe contener una frase corta (menos de 140 caracteres) tomada del texto, no una paráfrasis.
- Las claves de cada evidencia deben ser exactamente los IDs de su capa; nunca uses "1" salvo que 1 esté en esa lista.
- "confianza" es un número entre 0 y 1 con dos decimales.
- Si no hay evidencia suficiente, devuelve {"subfactores": [], "evidencia": {}, "subfactores_extendidos": [], "evidencia_extendida": {}, "confianza": 0.0}.
- No expliques el razonamiento. No cuentes artículos. No calcules nada.

""" + EQUIVALENCIAS_SUB + REGLAS_DUALES + EQUIVALENCIAS_EXTENDIDAS + """
CATÁLOGO EN INGLÉS (factor: subfactores):
""" + catalogo_ingles(catalogo)


def sistema_subfactores_groq(catalogo):
    """Versión compacta del prompt de subfactores, usada solo por Groq."""
    return """Marca subfactores sustanciados en el título y el resumen de un artículo sobre adopción FLOSS.
JSON exacto: {"subfactores": [1], "evidencia": {"1": "frase literal del texto"}, "subfactores_extendidos": [1, 9], "evidencia_extendida": {"1": "frase literal del texto", "9": "frase literal del texto"}, "confianza": 0.85}
Usa solo IDs del catálogo; máximo 6 por capa; sin explicaciones y sin calcular nada.
Marca un subfactor si el texto afirma claramente la misma idea, aunque use otras palabras (equivalencia semántica explícita). No deduzcas de contexto general.
En "subfactores" cuenta afirmaciones positivas sobre FLOSS y carencias del propietario si motivan su adopción; no marques carencias de FLOSS ni motivos para elegir propietario.
En "subfactores_extendidos" incluye TODOS los IDs de "subfactores" y añade menciones indirectas/comparativas con frase literal; si no hay nuevos, copia la capa estricta. Nunca devuelvas un subconjunto.
Si el texto solo nombra el factor de forma genérica, no marques ningún subfactor de ese factor.
Evidencia: menos de 140 caracteres, tomada del texto; claves = IDs exactos de su capa, nunca "1" salvo que esté en esa lista.
Si no hay evidencia suficiente, devuelve {"subfactores": [], "evidencia": {}, "subfactores_extendidos": [], "evidencia_extendida": {}, "confianza": 0.0}.
""" + EQUIVALENCIAS_SUB + EQUIVALENCIAS_EXTENDIDAS + """
CATÁLOGO EN INGLÉS:
""" + catalogo_ingles(catalogo)


def plantilla_subfactores(titulo, resumen, anio):
    return f"TÍTULO: {titulo}\nRESUMEN: {resumen}\nAÑO: {anio}\n\nDevuelve solo el JSON con ambas capas de subfactores sustanciados."


def huella_config(config):
    canonico = json.dumps(config, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    import hashlib
    return hashlib.sha256(canonico.encode("utf-8")).hexdigest()
