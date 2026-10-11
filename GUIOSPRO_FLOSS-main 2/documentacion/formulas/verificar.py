# -*- coding: utf-8 -*-
"""Reproduce los calculos de la Tabla 5.3 de la tesis y los compara con el catalogo.

Aplica las formulas 5.1 y 5.2 a los datos de entrada que publica la tesis (numero
de subfactores y total de citas), calcula los cuartiles por los dos metodos que
el documento admite, deriva IL e IS, y comprueba tres cosas:

  1. que los IL obtenidos coinciden con los que publica la Tabla 5.3;
  2. que los IS obtenidos coinciden con los que publica la Tabla 5.3;
  3. que el catalogo que usa el sistema coincide con esos IS.

No necesita dependencias. Se ejecuta con:  python verificar.py
"""
import json
import os
import sys

# la consola de Windows usa cp1252 y se atraganta con los acentos
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

# ── Datos de entrada de la Tabla 5.3 (pagina 88 de la tesis) ────────────────
# (factor, dimension, NS, TC, IL publicado, IS publicado)
TABLA_5_3 = [
    ('Compatibilidad',                        'Tecnológica',    8, 33, 3, 3),
    ('Fiabilidad',                            'Tecnológica',    5, 19, 3, 3),
    ('Mantenibilidad',                        'Tecnológica',    1,  4, 3, 3),
    ('Personalización',                       'Tecnológica',    6, 30, 4, 3),
    ('Prueba',                                'Tecnológica',    1,  4, 3, 3),
    ('Documentación',                         'Tecnológica',   11, 20, 1, 2),
    ('Portabilidad',                          'Tecnológica',    2,  4, 2, 2),
    ('Reusabilidad',                          'Tecnológica',    2,  5, 2, 2),
    ('Usabilidad',                            'Tecnológica',    4, 14, 2, 2),
    ('Apoyo de la alta dirección',            'Organizacional', 1,  5, 4, 3),
    ('Formación',                             'Organizacional', 4, 27, 4, 3),
    ('Soporte',                               'Organizacional', 6, 43, 4, 3),
    ('Actitud hacia el cambio',               'Organizacional', 2,  3, 1, 2),
    ('Bloqueo de proveedores',                'Organizacional', 1,  3, 2, 2),
    ('Casos de estudio de adopción FLOSS',    'Organizacional', 1,  1, 1, 2),
    ('Centralidad de la tecnología de la información',
                                              'Organizacional', 2,  2, 1, 2),
    ('Tiempo de adopción',                    'Organizacional', 2,  2, 1, 2),
    ('Coste total de propiedad',              'Económica',      2, 24, 4, 3),
]

IE = 3                 # la importancia del experto vale 3 en los dieciocho factores
NIVEL = {1: 'Irrelevante', 2: 'Opcional', 3: 'Importante', 4: 'Fundamental'}


def figura_5_10(a, b):
    """La funcion de la Figura 5.10: promedio de las dos entradas, hacia abajo."""
    return ((a - 1) + (b - 1)) // 2 + 1


def cuartil_interpolado(valores, p):
    """El metodo estandar, equivalente a CUARTIL.INC de Excel."""
    orden = sorted(valores)
    pos = (len(orden) - 1) * p          # posicion en base 0
    bajo = int(pos)
    resto = pos - bajo
    if bajo + 1 >= len(orden):
        return orden[bajo]
    return orden[bajo] + resto * (orden[bajo + 1] - orden[bajo])


def formula_5_2(r, cortes):
    """Asigna el nivel segun en que cuartil cae r."""
    q1, q2, q3 = cortes
    if r <= q1:
        return 1
    if r <= q2:
        return 2
    if r <= q3:
        return 3
    return 4


def main():
    # ── formula 5.1 ──────────────────────────────────────────────────────────
    erres = {f: tc / ns for f, _, ns, tc, _, _ in TABLA_5_3}
    valores = sorted(erres.values())

    print('FÓRMULA 5.1 · r = TC / NS')
    print(f'  los 18 valores de r, ordenados:')
    print('   ', '  '.join(f'{v:.3f}'.rstrip('0').rstrip('.') for v in valores))
    print(f'  suma de subfactores: {sum(ns for _, _, ns, _, _, _ in TABLA_5_3)}'
          f'  (el catálogo tiene 61)')

    # ── los cuartiles, por los dos metodos ───────────────────────────────────
    interp = tuple(cuartil_interpolado(valores, p) for p in (0.25, 0.50, 0.75))
    # el otro metodo: el maximo de cada grupo, segun la lectura literal de la tesis
    grupos = [[v for v in valores if formula_5_2(v, interp) == k] for k in (1, 2, 3, 4)]
    maximos = tuple(max(g) for g in grupos[:3])

    print()
    print('FÓRMULA 5.2 · los cuartiles')
    print(f'  interpolados (CUARTIL.INC): q1={interp[0]:.4g}  q2={interp[1]:.4g}  q3={interp[2]:.4g}')
    print(f'  máximo de cada grupo      : q1={maximos[0]:.4g}  q2={maximos[1]:.4g}  q3={maximos[2]:.4g}')

    iguales = all(formula_5_2(r, interp) == formula_5_2(r, maximos) for r in erres.values())
    print(f'  ¿los dos métodos dan el mismo IL en los 18 factores? '
          f'{"SÍ" if iguales else "NO"}')

    # ── IL e IS ──────────────────────────────────────────────────────────────
    print()
    print('COMPROBACIÓN CONTRA LA TABLA 5.3')
    print(f'  {"factor":48} {"r":>7}  IL  IS   tesis')
    fallos_il = fallos_is = 0
    calculado = {}
    for factor, _, ns, tc, il_tesis, is_tesis in TABLA_5_3:
        r = erres[factor]
        il = formula_5_2(r, interp)
        isug = figura_5_10(il, IE)
        calculado[factor] = isug
        ok = il == il_tesis and isug == is_tesis
        fallos_il += il != il_tesis
        fallos_is += isug != is_tesis
        print(f'  {factor[:48]:48} {r:7.3f}  {il}   {isug}   '
              f'{"OK" if ok else f"NO tesis dice IL={il_tesis} IS={is_tesis}"}')
    print(f'  discrepancias: IL {fallos_il}, IS {fallos_is}')

    # ── el catalogo del sistema ──────────────────────────────────────────────
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        '..', '..', 'backend', 'fixtures', 'factores.json')
    if not os.path.exists(ruta):
        print('\n(no encuentro el catálogo del sistema; se omite la tercera comprobación)')
        return
    with open(ruta, encoding='utf-8') as f:
        datos = json.load(f)
    catalogo = {d['fields']['nombre']: d['fields']['importancia_sugerida']
                for d in datos if d['model'] == 'factores.factor'}

    print()
    print('COMPROBACIÓN CONTRA EL CATÁLOGO DEL SISTEMA')
    difs = []
    for factor, isug in calculado.items():
        real = catalogo.get(factor)
        if real is None:
            print(f'  ? el catálogo no tiene {factor!r}')
        elif real != isug:
            difs.append((factor, isug, real))
    for factor, esperado, real in difs:
        print(f'  NO {factor}: la tesis da {NIVEL[esperado]} ({esperado}), '
              f'el catálogo trae {NIVEL[real]} ({real})')
    print(f'  coinciden {len(calculado) - len(difs)} de {len(calculado)}')
    if difs:
        print('  -> heredadas del fichero factors.csv del prototipo de partida')


if __name__ == '__main__':
    sys.exit(main())
