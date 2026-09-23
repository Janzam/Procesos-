# origen: main.py (update_results, btn_sub_pressed, compute_recommendation) | cambio: se corrigió el bug de la línea 351 (a, b, c = False → a, b, c = False, False, False)
from collections import defaultdict

NIVELES = ["Irrelevante", "Opcional", "Importante", "Fundamental"]

ALCANCES_VALIDOS = ("Interno", "Externo")
# Alcance usado cuando un factor 'Ambos' quedó sin resolver (datos anteriores a la
# validación del endpoint). Coincide con el valor preseleccionado en el formulario,
# para que el backend clasifique igual que lo que el decisor vio en pantalla.
ALCANCE_POR_DEFECTO = "Interno"

TEXTOS_RECOMENDACION = {
    "C": (
        "Recomendación C: La organización debe de proporcionar los recursos necesarios que "
        "garanticen una adopción satisfactoria. Si se trata de factores internos deben de ser "
        "aspectos a mejorar dentro de la organización y si son factores externos, dedicar "
        "recursos de ingeniería para mejorar el software."
    ),
    "B": (
        "Recomendación B: Es posible adoptar. A pesar que se han detectado amenazas y/o "
        "debilidades en factores cuya importancia relativa es opcional, por lo tanto, se sugiere "
        "revisar los criterios que no cumplen con lo mínimo requerido para adoptar."
    ),
    "A": (
        "Recomendación A: Adoptar. Todos los factores han sido identificados como Oportunidades "
        "y/o Fortalezas. Esto quiere decir que la organización cumple satisfactoriamente con la "
        "mayoría de requisitos para adoptar la solución FLOSS."
    ),
}


def calcular_importancia_relativa(importancia_sugerida: int, importancia_decisor: int) -> dict:
    """
    origen: main.py líneas 185-189
    Combina IS e ID usando índices 0-3 con división entera.
    Retorna etiqueta e índice de la importancia relativa, y si el factor es relevante.

    FUENTE ÚNICA de la fórmula IR: el frontend ya no la reimplementa, consume la
    matriz precalculada que expone matriz_importancia_relativa().
    """
    r1 = importancia_sugerida - 1   # IS: 1-4 → índice 0-3
    r2 = importancia_decisor - 1    # ID: 1-4 → índice 0-3
    r = (r1 + r2) // 2
    return {
        "indice": r,
        "etiqueta": NIVELES[r],
        "relevante": r > 0,
    }


def matriz_importancia_relativa() -> list[list[dict]]:
    """
    Matriz 4x4 con el resultado de la fórmula IR para cada combinación (IS, ID).
    Se indexa como matriz[IS-1][ID-1]. La expone el endpoint
    /api/recomendaciones/matriz-ir/ para que el frontend muestre la IR en vivo
    sin duplicar la fórmula en JavaScript.
    """
    return [
        [calcular_importancia_relativa(is_val, id_val) for id_val in range(1, 5)]
        for is_val in range(1, 5)
    ]


def calcular_ponderacion_global(valores_subfactores: list[int]) -> float | None:
    """
    origen: main.py línea 243
    Promedio aritmético simple de los valores (1-4) de los subfactores.
    Sin subfactores evaluados no existe ponderación: retorna None (antes retornaba
    0.0, un valor que al clasificarse habría dado siempre Debilidad/Amenaza).
    """
    if not valores_subfactores:
        return None
    return sum(valores_subfactores) / len(valores_subfactores)


def clasificar_foda(ponderacion_global: float, alcance: str) -> dict:
    """
    origen: main.py líneas 261-274
    Clasifica un factor según su ponderación global y alcance.
    alcance debe ser 'Interno' o 'Externo' (los 'Ambos' se resuelven antes de llegar aquí).
    """
    if alcance == "Interno":
        categoria = "Fortaleza" if ponderacion_global >= 3 else "Debilidad"
    elif alcance == "Externo":
        categoria = "Oportunidad" if ponderacion_global >= 3 else "Amenaza"
    else:
        # Antes cualquier valor distinto de 'Interno' (incluido 'Ambos') caía en la
        # rama Externo sin aviso. Ahora es un error explícito.
        raise ValueError(
            f"alcance inválido: {alcance!r}. Debe ser uno de {ALCANCES_VALIDOS}."
        )
    color = "good" if ponderacion_global >= 3 else "bad"
    return {"categoria": categoria, "color": color}


def resolver_alcance(alcance_factor: str, alcance_elegido: str | None) -> str:
    """
    Resuelve el alcance efectivo de un factor evaluado.
    Los factores 'Ambos' requieren la elección del decisor; si falta (datos antiguos,
    guardados antes de que el endpoint lo validara) se aplica ALCANCE_POR_DEFECTO de
    forma explícita y documentada, en vez de caer en una rama por descarte.
    """
    if alcance_elegido in ALCANCES_VALIDOS:
        return alcance_elegido
    if alcance_factor in ALCANCES_VALIDOS:
        return alcance_factor
    return ALCANCE_POR_DEFECTO


def calcular_recomendacion(items_foda: list[dict]) -> dict:
    """
    origen: main.py líneas 350-368 (compute_recommendation)
    Aplica las 3 reglas de prioridad sobre los ítems evaluados.
    Bug corregido: la línea 351 original era `a, b, c = False` (inválido en Python 3).

    items_foda: lista de dicts con claves 'ir_etiqueta' y 'foda_categoria'
                solo para factores que tienen FODA calculado (no vacíos).

    Solo se necesitan dos banderas: la tercera del original (`c`) se asignaba pero
    nunca se leía, porque la recomendación A es el caso por defecto.
    """
    if not items_foda:
        return {"codigo": "", "texto": "", "color": "neutro"}

    hay_critico = False   # Amenaza/Debilidad en factor Importante o Fundamental → C
    hay_opcional = False  # Amenaza/Debilidad en factor Opcional → B

    for item in items_foda:
        foda = item["foda_categoria"]
        ir = item["ir_etiqueta"]
        if foda in ("Amenaza", "Debilidad"):
            if ir in ("Importante", "Fundamental"):
                hay_critico = True
            elif ir == "Opcional":
                hay_opcional = True

    if hay_critico:
        return {"codigo": "C", "texto": TEXTOS_RECOMENDACION["C"], "color": "bad"}
    elif hay_opcional:
        return {"codigo": "B", "texto": TEXTOS_RECOMENDACION["B"], "color": "neutro"}
    else:
        return {"codigo": "A", "texto": TEXTOS_RECOMENDACION["A"], "color": "good"}


def calcular_resultado_evaluacion(evaluacion) -> dict:
    """
    origen: main.py (flujo completo de 6 pasos)
    Orquesta todos los cálculos a partir de una instancia de Evaluacion ORM.
    Retorna el resultado completo: IR por factor, FODA por factor, recomendación final.
    """
    factores_resultado = []
    items_para_recomendacion = []

    # Una sola consulta para todos los subfactores, en vez de una por factor (N+1).
    valores_por_factor = defaultdict(list)
    for factor_id, valor in evaluacion.subfactores_eval.values_list('subfactor__factor_id', 'valor'):
        valores_por_factor[factor_id].append(valor)

    for ef in evaluacion.factores_eval.select_related('factor__dimension').all():
        factor = ef.factor
        ir = calcular_importancia_relativa(factor.importancia_sugerida, ef.importancia_decisor)

        if not ir["relevante"]:
            factores_resultado.append({
                "factor_id": factor.id,
                "factor_nombre": factor.nombre,
                "dimension": factor.dimension.nombre,
                "ir_etiqueta": ir["etiqueta"],
                "relevante": False,
                "ponderacion_global": None,
                "foda_categoria": None,
                "foda_color": None,
                "alcance": None,
            })
            continue

        alcance = resolver_alcance(factor.alcance, ef.alcance_elegido)
        ponderacion = calcular_ponderacion_global(valores_por_factor.get(factor.id, []))

        if ponderacion is not None:
            foda = clasificar_foda(ponderacion, alcance)
            items_para_recomendacion.append({
                "ir_etiqueta": ir["etiqueta"],
                "foda_categoria": foda["categoria"],
            })
        else:
            foda = {"categoria": None, "color": None}

        factores_resultado.append({
            "factor_id": factor.id,
            "factor_nombre": factor.nombre,
            "dimension": factor.dimension.nombre,
            "ir_etiqueta": ir["etiqueta"],
            "relevante": True,
            "ponderacion_global": round(ponderacion, 2) if ponderacion is not None else None,
            "foda_categoria": foda["categoria"],
            "foda_color": foda["color"],
            "alcance": alcance,
        })

    recomendacion = calcular_recomendacion(items_para_recomendacion)

    return {
        "factores": factores_resultado,
        "recomendacion": recomendacion,
    }
