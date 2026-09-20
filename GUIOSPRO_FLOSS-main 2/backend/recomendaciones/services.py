# origen: main.py (update_results, btn_sub_pressed, compute_recommendation) | cambio: se corrigió el bug de la línea 351 (a, b, c = False → a, b, c = False, False, False)

NIVELES = ["Irrelevante", "Opcional", "Importante", "Fundamental"]

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
    """
    r1 = importancia_sugerida - 1   # IS: 1-4 → índice 0-3
    r2 = importancia_decisor - 1    # ID: 1-4 → índice 0-3
    r = (r1 + r2) // 2
    return {
        "indice": r,
        "etiqueta": NIVELES[r],
        "relevante": r > 0,
    }


def calcular_ponderacion_global(valores_subfactores: list[int]) -> float:
    """
    origen: main.py línea 243
    Promedio aritmético simple de los valores (1-4) de los subfactores.
    """
    if not valores_subfactores:
        return 0.0
    return sum(valores_subfactores) / len(valores_subfactores)


def clasificar_foda(ponderacion_global: float, alcance: str) -> dict:
    """
    origen: main.py líneas 261-274
    Clasifica un factor según su ponderación global y alcance.
    alcance debe ser 'Interno' o 'Externo' (los 'Ambos' ya fueron resueltos por el decisor).
    """
    if alcance == "Interno":
        if ponderacion_global >= 3:
            categoria = "Fortaleza"
            color = "good"
        else:
            categoria = "Debilidad"
            color = "bad"
    else:
        if ponderacion_global >= 3:
            categoria = "Oportunidad"
            color = "good"
        else:
            categoria = "Amenaza"
            color = "bad"
    return {"categoria": categoria, "color": color}


def calcular_recomendacion(items_foda: list[dict]) -> dict:
    """
    origen: main.py líneas 350-368 (compute_recommendation)
    Aplica las 3 reglas de prioridad sobre los ítems evaluados.
    Bug corregido: la línea 351 original era `a, b, c = False` (inválido en Python 3).
    Corrección: a, b, c = False, False, False

    items_foda: lista de dicts con claves 'ir_etiqueta' y 'foda_categoria'
                solo para factores que tienen FODA calculado (no vacíos).
    """
    if not items_foda:
        return {"codigo": "", "texto": "", "color": "neutro"}

    # Bug fix: era `a, b, c = False` en main.py línea 351
    a, b, c = False, False, False

    for item in items_foda:
        foda = item["foda_categoria"]
        ir = item["ir_etiqueta"]
        if (foda in ("Amenaza", "Debilidad")) and (ir in ("Importante", "Fundamental")):
            a = True
        elif (foda in ("Amenaza", "Debilidad")) and (ir == "Opcional"):
            b = True
        else:
            c = True

    if a:
        return {"codigo": "C", "texto": TEXTOS_RECOMENDACION["C"], "color": "bad"}
    elif b:
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

    for ef in evaluacion.factores_eval.select_related('factor').all():
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

        alcance = ef.alcance_elegido if ef.alcance_elegido else factor.alcance

        valores_subfactores = list(
            evaluacion.subfactores_eval
            .filter(subfactor__factor=factor)
            .values_list('valor', flat=True)
        )

        ponderacion = calcular_ponderacion_global(valores_subfactores) if valores_subfactores else None

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
