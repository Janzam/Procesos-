# origen: main.py (update_results, btn_sub_pressed, compute_recommendation)
# cambio: se corrigió el bug de la línea 351 (a, b, c = False → a, b, c = False, False, False)
#
# ─────────────────────────────────────────────────────────────────────────────
# EL CÁLCULO ES EL DE LA TESIS, SIN VARIANTES.
#
# Los seis pasos se implementan tal como los define Rea Sánchez (2022) y tal como
# los ejecuta el prototipo original: la importancia relativa con división entera,
# el filtrado de irrelevantes, el promedio aritmético de los subfactores —donde
# «Desconozco si cumple» entra con valor 2—, el umbral único en 3,0 y la
# recomendación por existencia. No hay fórmula alternativa ni parámetro que cambie
# ningún resultado.
#
# Lo que sí añade este módulo es una capa de DIAGNÓSTICO: cobertura, factores que
# causan la recomendación, respuestas determinantes y conjunto mínimo de cambios.
# Son lecturas sobre un resultado ya calculado y ninguna lo modifica. Sirven para
# que el decisor entienda de qué depende su veredicto, no para cambiarlo.
# ─────────────────────────────────────────────────────────────────────────────
from collections import defaultdict

NIVELES = ["Irrelevante", "Opcional", "Importante", "Fundamental"]

ALCANCES_VALIDOS = ("Interno", "Externo")
# Alcance usado cuando un factor 'Ambos' quedó sin resolver (datos anteriores a la
# validación del endpoint). Coincide con el valor preseleccionado en el formulario,
# para que el backend clasifique igual que lo que el decisor vio en pantalla.
ALCANCE_POR_DEFECTO = "Interno"

# Segundo nivel de la escala de cumplimiento. La metodología lo promedia como un
# valor más; aquí solo se cuenta aparte para INFORMAR de cuánto se desconoce, nunca
# para alterar el cálculo.
VALOR_DESCONOZCO = 2

# Umbral de la Ecuación 5.3: a partir de 3,0 el factor es favorable.
UMBRAL = 3.0

DESFAVORABLES = ("Amenaza", "Debilidad")
CRITICAS = ("Importante", "Fundamental")

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


# ─────────────────────────────────────────────────────────────────────────────
# Paso 2 · Importancia relativa
# ─────────────────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# Paso 4 · Ponderación media
# ─────────────────────────────────────────────────────────────────────────────
def ponderar(valores_subfactores: list[int]) -> dict:
    """
    Promedio aritmético de las valoraciones de los subfactores del factor, tal como
    lo define la metodología: entran todas, incluido el 2 de «Desconozco si cumple».

    Devuelve además cuántas respuestas fueron «Desconozco» y qué cobertura real
    tiene el factor. Son datos INFORMATIVOS: no intervienen en la ponderación ni en
    la clasificación, solo permiten avisar al decisor de qué parte de su resultado
    descansa en lo que no sabe.
    """
    total = len(valores_subfactores)
    if not total:
        return {
            "ponderacion": None,
            "subfactores_totales": 0,
            "subfactores_sin_conocer": 0,
            "cobertura": None,
        }

    sin_conocer = sum(1 for v in valores_subfactores if v == VALOR_DESCONOZCO)
    return {
        "ponderacion": sum(valores_subfactores) / total,
        "subfactores_totales": total,
        "subfactores_sin_conocer": sin_conocer,
        "cobertura": round((total - sin_conocer) / total, 2),
    }


def calcular_ponderacion_global(valores_subfactores: list[int]) -> float | None:
    """
    origen: main.py línea 243
    Promedio aritmético simple de los valores (1-4) de los subfactores.
    Sin subfactores evaluados no existe ponderación: retorna None (antes retornaba
    0.0, un valor que al clasificarse habría dado siempre Debilidad/Amenaza).
    """
    return ponderar(valores_subfactores)["ponderacion"]


# ─────────────────────────────────────────────────────────────────────────────
# Paso 5 · Clasificación FODA
# ─────────────────────────────────────────────────────────────────────────────
def clasificar_foda(ponderacion_global: float, alcance: str) -> dict:
    """
    origen: main.py líneas 261-274
    Clasifica un factor según su ponderación global y su alcance (Ecuación 5.3).
    alcance debe ser 'Interno' o 'Externo' (los 'Ambos' se resuelven antes de llegar aquí).
    """
    if alcance not in ALCANCES_VALIDOS:
        # Antes cualquier valor distinto de 'Interno' (incluido 'Ambos') caía en la
        # rama Externo sin aviso. Ahora es un error explícito.
        raise ValueError(
            f"alcance inválido: {alcance!r}. Debe ser uno de {ALCANCES_VALIDOS}."
        )

    favorable = ponderacion_global >= UMBRAL
    if alcance == "Interno":
        categoria = "Fortaleza" if favorable else "Debilidad"
    else:
        categoria = "Oportunidad" if favorable else "Amenaza"

    return {"categoria": categoria, "color": "good" if favorable else "bad"}


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


# ─────────────────────────────────────────────────────────────────────────────
# Paso 6 · Recomendación
# ─────────────────────────────────────────────────────────────────────────────
def calcular_recomendacion(items_foda: list[dict]) -> dict:
    """
    origen: main.py líneas 350-368 (compute_recommendation)
    Bug corregido: la línea 351 original era `a, b, c = False` (inválido en Python 3).

    Regla por existencia, que es la que ejecuta el prototipo original: basta una
    debilidad o amenaza en un factor importante o fundamental para emitir la C.

    La tesis no formaliza este paso mediante una expresión y su texto admite otra
    lectura —por mayoría—. El sistema implementa la del código original y documenta
    la ambigüedad en lugar de resolverla por su cuenta.
    """
    if not items_foda:
        return {"codigo": "", "texto": "", "color": "neutro", "detalle": {}}

    criticas = opcionales = favorables = desfavorables = 0
    for item in items_foda:
        foda = item["foda_categoria"]
        ir = item["ir_etiqueta"]
        if foda in DESFAVORABLES:
            desfavorables += 1
            if ir in CRITICAS:
                criticas += 1
            elif ir == "Opcional":
                opcionales += 1
        else:
            favorables += 1

    if criticas:
        codigo = "C"
    elif opcionales:
        codigo = "B"
    else:
        codigo = "A"

    return {
        "codigo": codigo,
        "texto": TEXTOS_RECOMENDACION[codigo],
        "color": {"C": "bad", "B": "neutro", "A": "good"}[codigo],
        "detalle": {
            "favorables": favorables,
            "desfavorables": desfavorables,
            "criticas": criticas,
            "opcionales": opcionales,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Lectura de la base de datos
# ─────────────────────────────────────────────────────────────────────────────
def _ensamblar(filas_subfactores, filas_factores, ids) -> dict:
    """
    Arma las instantáneas a partir de filas ya leídas, sin tocar la base de datos.

    filas_subfactores: (evaluacion_id, subfactor_id, factor_id, subfactor_nombre, valor)
    filas_factores:    (evaluacion_id, factor_id, factor_nombre, dimension,
                        importancia_sugerida, importancia_decisor,
                        alcance_factor, alcance_elegido)

    Es el único sitio donde se da forma a la instantánea: la versión por lotes y la
    de una sola evaluación comparten esta función y solo difieren en cómo obtienen
    las filas.
    """
    valores = defaultdict(lambda: defaultdict(list))   # evaluación → factor → [valor]
    respuestas = defaultdict(list)
    for ev_id, sub_id, factor_id, sub_nombre, valor in filas_subfactores:
        valores[ev_id][factor_id].append(valor)
        respuestas[ev_id].append({
            "subfactor_id": sub_id,
            "subfactor_nombre": sub_nombre,
            "factor_id": factor_id,
            "valor": valor,
        })

    factores = defaultdict(list)
    for (ev_id, factor_id, factor_nombre, dimension,
         imp_sugerida, imp_decisor, alcance_factor, alcance_elegido) in filas_factores:
        factores[ev_id].append({
            "factor_id": factor_id,
            "factor_nombre": factor_nombre,
            "dimension": dimension,
            "importancia_sugerida": imp_sugerida,
            "importancia_decisor": imp_decisor,
            "alcance_factor": alcance_factor,
            "alcance_elegido": alcance_elegido,
            "valores": valores[ev_id].get(factor_id, []),
        })

    return {i: {"factores": factores.get(i, []), "respuestas": respuestas.get(i, [])}
            for i in ids}


def instantaneas(evaluaciones) -> dict:
    """
    Lee todo lo que el cálculo necesita para N evaluaciones en dos consultas, no en
    dos por evaluación.

    El historial y el panel de métricas resuelven todas las evaluaciones almacenadas
    para mostrar su recomendación. Hacerlo de una en una costaba dos consultas por
    evaluación —doscientas con cien evaluaciones—; agrupadas, el coste queda en dos
    consultas constantes, que es lo que el RNF-02 pide para el historial.
    """
    # Importación diferida: el motor no depende de la capa de datos en tiempo de
    # carga, solo cuando efectivamente lee de ella.
    from evaluaciones.models import EvaluacionFactor, EvaluacionSubfactor

    ids = [ev.id for ev in evaluaciones]
    if not ids:
        return {}

    filas_sub = (EvaluacionSubfactor.objects
                 .filter(evaluacion_id__in=ids)
                 .values_list('evaluacion_id', 'subfactor_id', 'subfactor__factor_id',
                              'subfactor__nombre', 'valor'))
    filas_fac = (EvaluacionFactor.objects
                 .filter(evaluacion_id__in=ids)
                 .values_list('evaluacion_id', 'factor_id', 'factor__nombre',
                              'factor__dimension__nombre', 'factor__importancia_sugerida',
                              'importancia_decisor', 'factor__alcance', 'alcance_elegido'))
    return _ensamblar(filas_sub, filas_fac, ids)


def instantanea(evaluacion) -> dict:
    """
    Instantánea de una sola evaluación, leída a través de sus managers.

    Separar la lectura del cálculo permite resolver la misma evaluación muchas veces
    —alterando una respuesta— sin volver a consultar, que es lo que hacen
    respuestas_determinantes() y plan_minimo().
    """
    ev_id = evaluacion.id
    filas_sub = [(ev_id, sub_id, factor_id, sub_nombre, valor)
                 for sub_id, factor_id, sub_nombre, valor
                 in evaluacion.subfactores_eval.values_list(
                     'subfactor_id', 'subfactor__factor_id', 'subfactor__nombre', 'valor')]
    filas_fac = [(ev_id, ef.factor.id, ef.factor.nombre, ef.factor.dimension.nombre,
                  ef.factor.importancia_sugerida, ef.importancia_decisor,
                  ef.factor.alcance, ef.alcance_elegido)
                 for ef in evaluacion.factores_eval.select_related('factor__dimension').all()]
    return _ensamblar(filas_sub, filas_fac, [ev_id])[ev_id]


# ─────────────────────────────────────────────────────────────────────────────
# Orquestación de los seis pasos
# ─────────────────────────────────────────────────────────────────────────────
def resolver(inst: dict) -> dict:
    """Aplica los seis pasos sobre una instantánea, sin tocar la base de datos."""
    factores_resultado = []
    items_para_recomendacion = []

    for f in inst["factores"]:
        ir = calcular_importancia_relativa(f["importancia_sugerida"], f["importancia_decisor"])

        if not ir["relevante"]:
            factores_resultado.append({
                "factor_id": f["factor_id"],
                "factor_nombre": f["factor_nombre"],
                "dimension": f["dimension"],
                "ir_etiqueta": ir["etiqueta"],
                "relevante": False,
                "ponderacion_global": None,
                "foda_categoria": None,
                "foda_color": None,
                "alcance": None,
                "cobertura": None,
                "subfactores_sin_conocer": 0,
                "subfactores_totales": len(f["valores"]),
            })
            continue

        alcance = resolver_alcance(f["alcance_factor"], f["alcance_elegido"])
        p = ponderar(f["valores"])
        ponderacion = p["ponderacion"]

        if ponderacion is not None:
            foda = clasificar_foda(ponderacion, alcance)
            items_para_recomendacion.append({
                "ir_etiqueta": ir["etiqueta"],
                "foda_categoria": foda["categoria"],
            })
        else:
            foda = {"categoria": None, "color": None}

        factores_resultado.append({
            "factor_id": f["factor_id"],
            "factor_nombre": f["factor_nombre"],
            "dimension": f["dimension"],
            "ir_etiqueta": ir["etiqueta"],
            "relevante": True,
            "ponderacion_global": round(ponderacion, 2) if ponderacion is not None else None,
            "foda_categoria": foda["categoria"],
            "foda_color": foda["color"],
            "alcance": alcance,
            # Informativos: no intervienen en nada de lo anterior.
            "cobertura": p["cobertura"],
            "subfactores_sin_conocer": p["subfactores_sin_conocer"],
            "subfactores_totales": p["subfactores_totales"],
        })

    return {
        "factores": factores_resultado,
        "recomendacion": calcular_recomendacion(items_para_recomendacion),
    }


def calcular_resultado_evaluacion(evaluacion) -> dict:
    """
    origen: main.py (flujo completo de 6 pasos)
    Orquesta todos los cálculos a partir de una instancia de Evaluacion ORM.
    """
    return resolver(instantanea(evaluacion))


def calcular_resultados_evaluaciones(evaluaciones) -> dict:
    """Resuelve varias evaluaciones de una vez y devuelve {id: resultado}."""
    insts = instantaneas(evaluaciones)
    vacia = {"factores": [], "respuestas": []}
    return {ev.id: resolver(insts.get(ev.id, vacia)) for ev in evaluaciones}


# ─────────────────────────────────────────────────────────────────────────────
# Diagnóstico del resultado
#
# Todo lo que sigue LEE un resultado ya calculado. Ninguna de estas funciones
# cambia una ponderación, una clasificación ni una recomendación.
# ─────────────────────────────────────────────────────────────────────────────
def _observacion(f: dict) -> str:
    """Explica en una frase de dónde sale la clasificación de un factor desfavorable."""
    sin_conocer = f.get("subfactores_sin_conocer") or 0
    total = f.get("subfactores_totales") or 0

    if sin_conocer and sin_conocer == total:
        criterios = "criterio" if total == 1 else f"{total} criterios"
        return (
            f"No se conoce su {criterios}: la ponderación de {f['ponderacion_global']} sale de "
            f"respuestas «Desconozco si cumple», no de un incumplimiento comprobado. "
            f"Verificarlo es lo más barato que puede hacerse."
        )
    if sin_conocer:
        return (
            f"{sin_conocer} de sus {total} criterios están sin conocer y la metodología los "
            f"promedia como un 2. Conviene verificarlos antes de dar la clasificación por buena."
        )
    if total == 1:
        return (
            "Depende de una sola pregunta: la clasificación del factor es la respuesta a ese "
            "único criterio."
        )
    return (
        f"Sus {total} criterios están respondidos: la clasificación refleja un incumplimiento "
        f"comprobado, no una falta de información."
    )


def diagnostico(evaluacion) -> dict:
    """
    Explica el resultado obtenido: qué factores lo causan y de qué información
    depende cada uno.

    Cuando la recomendación no es A, enumera los factores que la están provocando.
    Cuando es A, señala los puntos que conviene vigilar aunque no impidan adoptar.
    En ningún caso recalcula nada.
    """
    resultado = calcular_resultado_evaluacion(evaluacion)
    codigo = resultado["recomendacion"]["codigo"]
    factores = resultado["factores"]

    relevantes = [f for f in factores if f["relevante"] and f["ponderacion_global"] is not None]
    desfavorables = [f for f in relevantes if f["foda_categoria"] in DESFAVORABLES]

    # Los que causan la recomendación actual: críticos si es C, opcionales si es B.
    if codigo == "C":
        causantes = [f for f in desfavorables if f["ir_etiqueta"] in CRITICAS]
    elif codigo == "B":
        causantes = [f for f in desfavorables if f["ir_etiqueta"] == "Opcional"]
    else:
        causantes = []

    detalle = [
        {
            "factor_id": f["factor_id"],
            "factor_nombre": f["factor_nombre"],
            "dimension": f["dimension"],
            "ir_etiqueta": f["ir_etiqueta"],
            "categoria": f["foda_categoria"],
            "ponderacion": f["ponderacion_global"],
            "umbral": UMBRAL,
            "subfactores_totales": f["subfactores_totales"],
            "subfactores_sin_conocer": f["subfactores_sin_conocer"],
            "cobertura": f["cobertura"],
            "observacion": _observacion(f),
        }
        for f in sorted(causantes, key=lambda x: (x["ponderacion_global"] or 0))
    ]

    # Avisos que aplican tanto si se adopta como si no.
    avisos = []
    sin_conocer_total = sum(f["subfactores_sin_conocer"] for f in relevantes)
    respuestas_total = sum(f["subfactores_totales"] for f in relevantes)
    if sin_conocer_total:
        avisos.append(
            f"{sin_conocer_total} de las {respuestas_total} respuestas que entran en el cálculo "
            f"son «Desconozco si cumple». La metodología las promedia como un 2, de modo que esa "
            f"parte del resultado mide lo que no se sabe del producto, no lo que incumple."
        )

    fragiles = [f for f in desfavorables if f["subfactores_totales"] == 1]
    if fragiles:
        nombres = ", ".join(f["factor_nombre"] for f in fragiles)
        avisos.append(
            f"{len(fragiles)} de los factores desfavorables se deciden con una sola pregunta "
            f"({nombres}). Conviene confirmar esas respuestas antes de dar el resultado por bueno."
        )

    al_limite = [f for f in relevantes if abs(f["ponderacion_global"] - UMBRAL) < 0.25]
    if al_limite:
        nombres = ", ".join(f"{f['factor_nombre']} ({f['ponderacion_global']})" for f in al_limite)
        avisos.append(
            f"{len(al_limite)} {'factor queda' if len(al_limite) == 1 else 'factores quedan'} "
            f"muy cerca del umbral de {UMBRAL:.1f}: {nombres}. Una sola respuesta distinta "
            f"cambiaría su clasificación."
        )

    cobertura_global = (
        round((respuestas_total - sin_conocer_total) / respuestas_total, 2)
        if respuestas_total else None
    )

    n = len(detalle)
    if codigo == "A":
        titulo = "Se puede adoptar: esto es lo que conviene vigilar"
        resumen = (
            "Ningún factor relevante resultó desfavorable, de modo que nada impide la adopción. "
            "Los puntos siguientes no la bloquean, pero conviene revisarlos antes de decidir."
            if avisos else
            "Ningún factor relevante resultó desfavorable y el resultado no descansa en respuestas "
            "sin conocer: la evaluación sostiene la adopción con solidez."
        )
    elif codigo == "B":
        titulo = "Por qué la adopción es posible pero con reservas"
        resumen = (
            f"{n} {'factor opcional resultó desfavorable' if n == 1 else 'factores opcionales resultaron desfavorables'}. "
            f"Ninguno es crítico —por eso la metodología no desaconseja adoptar—, pero "
            f"{'es el que impide' if n == 1 else 'son los que impiden'} una recomendación plena."
        )
    elif codigo == "C":
        titulo = "Por qué no se recomienda adoptar todavía"
        resumen = (
            f"{n} {'factor importante resultó desfavorable' if n == 1 else 'factores importantes resultaron desfavorables'}. "
            f"Basta con uno para que la metodología emita la recomendación C, así que "
            f"{'resolverlo' if n == 1 else 'resolverlos'} es lo que cambia el resultado."
        )
    else:
        titulo = "Evaluación incompleta"
        resumen = ("No hay factores relevantes con respuestas suficientes para emitir una "
                   "recomendación.")

    return {
        "recomendacion": codigo,
        "titulo": titulo,
        "resumen": resumen,
        "causantes": detalle,
        "avisos": avisos,
        "cobertura_global": cobertura_global,
        "subfactores_sin_conocer": sin_conocer_total,
        "subfactores_evaluados": respuestas_total,
        "factores_relevantes": len(relevantes),
        "factores_desfavorables": len(desfavorables),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Respuestas determinantes
# ─────────────────────────────────────────────────────────────────────────────
def respuestas_determinantes(evaluacion) -> dict:
    """
    Señala las respuestas que, contestadas de otro modo, alterarían por sí solas la
    recomendación final. Es un análisis de sensibilidad sobre el resultado de la
    metodología, no una variante de ella.
    """
    inst = instantanea(evaluacion)
    base = resolver(inst)["recomendacion"]["codigo"]

    # Índice de la posición de cada respuesta dentro de la lista de su factor, para
    # poder alterarla sin rehacer la instantánea.
    posicion = defaultdict(int)
    indices = []
    for r in inst["respuestas"]:
        indices.append(posicion[r["factor_id"]])
        posicion[r["factor_id"]] += 1

    valores_originales = {f["factor_id"]: list(f["valores"]) for f in inst["factores"]}
    por_id = {f["factor_id"]: f for f in inst["factores"]}

    determinantes = []
    for r, i in zip(inst["respuestas"], indices):
        f = por_id.get(r["factor_id"])
        if f is None:
            continue
        original = r["valor"]
        # Se prueba cualquier otra valoración posible, no solo la contigua: limitar
        # el análisis a un nivel dejaría escapar casos evidentes (pasar de 1 a 2 no
        # cruza el umbral, pero pasar de 1 a 3 sí).
        for nuevo in sorted(range(1, 5), key=lambda v: abs(v - original)):
            if nuevo == original:
                continue
            f["valores"][i] = nuevo
            codigo = resolver(inst)["recomendacion"]["codigo"]
            f["valores"][i] = original
            if codigo != base:
                determinantes.append({
                    "subfactor_id": r["subfactor_id"],
                    "subfactor_nombre": r["subfactor_nombre"],
                    "factor_id": r["factor_id"],
                    "factor_nombre": f["factor_nombre"],
                    "valor_actual": original,
                    "valor_alternativo": nuevo,
                    "recomendacion_resultante": codigo,
                })
                break

    # deja la instantánea como estaba
    for fid, vs in valores_originales.items():
        por_id[fid]["valores"] = vs

    return {
        "recomendacion_actual": base,
        "total_respuestas": len(inst["respuestas"]),
        "determinantes": determinantes,
        "total_determinantes": len(determinantes),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Conjunto mínimo de cambios
# ─────────────────────────────────────────────────────────────────────────────
def _minimos_para_umbral(valores: list[int]) -> int | None:
    """Cuántas valoraciones habría que elevar a 4 para que el promedio alcance el umbral."""
    if not valores:
        return None
    n = len(valores)
    total = sum(valores)
    if total / n >= UMBRAL:
        return 0
    for k, v in enumerate(sorted(valores), start=1):
        total += 4 - v
        if total / n >= UMBRAL - 1e-9:
            return k
    return None


def plan_minimo(evaluacion) -> dict:
    """
    Determina qué haría falta para obtener una recomendación mejor: qué factores lo
    impiden, qué ponderación necesitarían y cuántos subfactores tendrían que mejorar.

    Todo el cálculo es determinista y emplea la fórmula de la metodología. El módulo
    de asistencia solo redacta el resultado, de modo que el plan sigue disponible con
    el asistente desactivado.
    """
    inst = instantanea(evaluacion)
    resultado = resolver(inst)
    actual = resultado["recomendacion"]["codigo"]

    if actual in ("", "A"):
        return {
            "recomendacion_actual": actual,
            "objetivo": None,
            "bloqueantes": [],
            "alcanzable": actual == "A",
        }

    valores = {f["factor_id"]: f["valores"] for f in inst["factores"]}

    bloqueantes = []
    for f in resultado["factores"]:
        if f["foda_categoria"] not in DESFAVORABLES:
            continue
        if actual == "C" and f["ir_etiqueta"] not in CRITICAS:
            continue

        vs = valores.get(f["factor_id"], [])
        bloqueantes.append({
            "factor_id": f["factor_id"],
            "factor_nombre": f["factor_nombre"],
            "dimension": f["dimension"],
            "ir_etiqueta": f["ir_etiqueta"],
            "categoria": f["foda_categoria"],
            "ponderacion_actual": f["ponderacion_global"],
            "ponderacion_objetivo": UMBRAL,
            "subfactores_a_mejorar": _minimos_para_umbral(vs),
            "subfactores_sin_conocer": f["subfactores_sin_conocer"],
            "subfactores_totales": len(vs),
        })

    bloqueantes.sort(key=lambda b: (b["subfactores_a_mejorar"] is None,
                                    b["subfactores_a_mejorar"] or 0))

    # El objetivo no se supone: se calcula. Resolver los bloqueantes puede saltar
    # más de un escalón, de modo que se simula el resultado en lugar de asumir que
    # se llega a la recomendación inmediatamente superior.
    alcanzable = all(b["subfactores_a_mejorar"] is not None for b in bloqueantes)
    objetivo = None
    if alcanzable and bloqueantes:
        copia = {fid: list(vs) for fid, vs in valores.items()}
        for b in bloqueantes:
            vs = valores[b["factor_id"]]
            for i in sorted(range(len(vs)), key=lambda j: vs[j])[:b["subfactores_a_mejorar"]]:
                vs[i] = 4
        objetivo = resolver(inst)["recomendacion"]["codigo"]
        for fid, vs in copia.items():
            valores[fid][:] = vs

    return {
        "recomendacion_actual": actual,
        "objetivo": objetivo,
        "bloqueantes": bloqueantes,
        "alcanzable": alcanzable,
    }
