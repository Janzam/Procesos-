"""Cálculo determinista de IL e IS. Sin Django, sin red, sin IA.

Fórmula 5.1: r = TC / NS.
Fórmula 5.2: cuartiles con interpolación lineal (equivalente a CUARTIL.INC).
Figura 5.10: salida = ((a-1) + (b-1)) // 2 + 1.
"""
from .datos.tabla_5_3 import TABLA_5_3, NIVELES, IE_TESIS


def figura_5_10(a, b):
    """Combinación conservadora de dos valoraciones en la escala 1-4."""
    if a not in NIVELES or b not in NIVELES:
        raise ValueError(f"Entradas fuera de la escala 1-4: {a}, {b}")
    return ((a - 1) + (b - 1)) // 2 + 1


def cuartil_interpolado(valores, p):
    """Percentil con interpolación lineal sobre la lista ordenada."""
    orden = sorted(valores)
    if not orden:
        raise ValueError("No hay valores para calcular el cuartil")
    pos = (len(orden) - 1) * p
    bajo = int(pos)
    resto = pos - bajo
    if bajo + 1 >= len(orden):
        return orden[bajo]
    return orden[bajo] + resto * (orden[bajo + 1] - orden[bajo])


def cortes_cuartiles(erres):
    """Devuelve (q1, q2, q3) calculados sobre los valores de r."""
    return tuple(cuartil_interpolado(erres, p) for p in (0.25, 0.50, 0.75))


def asignar_il(r, cortes):
    """Nivel de importancia de la literatura según la fórmula 5.2."""
    q1, q2, q3 = cortes
    if r <= q1:
        return 1
    if r <= q2:
        return 2
    if r <= q3:
        return 3
    return 4


def calcular(cantidades, ns_por_factor=None, ie=IE_TESIS, tabla=TABLA_5_3):
    """Calcula r, IL e IS para los 18 factores.

    `cantidades` mapea id de factor -> número de artículos/citas (TC).
    `ns_por_factor` permite usar un NS distinto; por defecto el de la tesis.
    """
    ns = dict(ns_por_factor or {})
    tc = {}
    for fila in tabla:
        fid = fila["id"]
        valor = cantidades.get(fid, cantidades.get(str(fid), cantidades.get(fila["nombre"], 0)))
        tc[fid] = int(valor or 0)
        ns.setdefault(fid, fila["ns"])

    erres = {f["id"]: tc[f["id"]] / ns[f["id"]] for f in tabla}
    cortes = cortes_cuartiles(erres.values())

    resultados = []
    for fila in tabla:
        fid = fila["id"]
        il = asignar_il(erres[fid], cortes)
        isug = figura_5_10(il, ie)
        resultados.append({
            "id": fid,
            "nombre": fila["nombre"],
            "dimension": fila["dimension"],
            "ns": ns[fid],
            "tc": tc[fid],
            "r": erres[fid],
            "il": il,
            "is": isug,
            "il_tesis": fila["il"],
            "is_tesis": fila["is"],
            "diff_il": il - fila["il"],
            "diff_is": isug - fila["is"],
        })
    return {"cortes": cortes, "factores": resultados}


def ranks(valores):
    """Rangos con promedio para empates, como exige Spearman."""
    pares = sorted(enumerate(valores), key=lambda p: p[1])
    salida = [0.0] * len(valores)
    i = 0
    while i < len(pares):
        j = i
        while j + 1 < len(pares) and pares[j + 1][1] == pares[i][1]:
            j += 1
        medio = (i + j) / 2 + 1
        for k in range(i, j + 1):
            salida[pares[k][0]] = medio
        i = j + 1
    return salida


def spearman(xs, ys):
    """Correlación de rangos de Spearman. Devuelve None si no hay varianza."""
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    rx, ry = ranks(xs), ranks(ys)
    n = len(xs)
    mx = sum(rx) / n
    my = sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    denx = sum((a - mx) ** 2 for a in rx)
    denial = sum((b - my) ** 2 for b in ry)
    if not denx or not denial:
        return None
    return num / (denx * denial) ** 0.5


def comparar(resultados, tabla=TABLA_5_3):
    """Métricas de coincidencia contra la Tabla 5.3."""
    exactos = sum(1 for f in resultados if f["il"] == f["il_tesis"])
    cerca = sum(1 for f in resultados if abs(f["diff_il"]) <= 1)
    misma_is = sum(1 for f in resultados if f["is"] == f["is_tesis"])
    rho = spearman(
        [f["r"] for f in resultados],
        [f["tc"] / f["ns"] for f in tabla],
    )
    return {
        "total": len(resultados),
        "il_exactos": exactos,
        "il_dentro_de_1": cerca,
        "is_iguales": misma_is,
        "spearman": rho,
        "cortes": [round(c, 4) for c in cortes_cuartiles([f["r"] for f in resultados])],
    }
