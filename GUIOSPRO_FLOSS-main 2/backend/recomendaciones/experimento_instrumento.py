# -*- coding: utf-8 -*-
"""
Experimento: cómo se comporta el instrumento de la metodología, medido.

No propone ninguna fórmula alternativa ni la ensaya. Aplica la metodología tal
como está —la de la tesis, sin variantes— a evaluaciones sintéticas generadas de
forma controlada, y mide a qué responde su veredicto.

La pregunta que contesta es: cuando cambia la recomendación, ¿cambia porque el
software es mejor o peor, o porque el evaluador sabe más o menos sobre él?

No necesita Django ni base de datos. Es determinista: misma semilla, mismas
cifras. Se ejecuta con:

    python backend/recomendaciones/experimento_instrumento.py

El diseño cruza las tres variables que, en la práctica, distinguen una evaluación
de otra:

  · PERFIL DE CUMPLIMIENTO — cómo responde el decisor a lo que sí conoce.
  · DESCONOCIMIENTO — qué proporción de criterios responde «Desconozco si cumple».
    La metodología los promedia como un 2, de modo que esta variable entra en el
    cálculo exactamente igual que un incumplimiento parcial.
  · IMPORTANCIA — qué importancia asigna el decisor a los factores, que determina
    cuáles entran en la evaluación y cuáles pesan en el paso 6.
"""
import io
import os
import random
import sys
import zlib
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))

from recomendaciones import services as sv                   # noqa: E402
from recomendaciones.catalogo_local import cargar, EF, Eva   # noqa: E402

FACTORES, CATALOGO = cargar()
DESCONOZCO = sv.VALOR_DESCONOZCO

SEMILLA = 20261005
REPLICAS = 5

# Cómo responde el decisor a los criterios que sí conoce.
PERFILES = {
    'favorable': [4, 4, 4, 3],
    'mixto':     [4, 3, 3, 1],
    'adverso':   [3, 1, 1, 1],
}

# Qué proporción de criterios quedan sin conocer.
DESCONOCIMIENTOS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5]

# Qué importancia asigna el decisor a cada factor.
IMPORTANCIAS = {
    'todo importante': lambda f, rnd: 3,
    'todo opcional':   lambda f, rnd: 2,
    'variada':         lambda f, rnd: rnd.choice([1, 2, 3, 4]),
}


def construir(perfil, desconocimiento, importancia, semilla):
    """Genera una evaluación sintética reproducible sobre el catálogo real."""
    rnd = random.Random(semilla)
    regla = IMPORTANCIAS[importancia]
    factores_eval = [
        EF(f, regla(f, rnd), 'Interno' if f.alcance == 'Ambos' else None)
        for f in FACTORES
    ]
    escala = PERFILES[perfil]
    subs = []
    for c in CATALOGO:
        valor = DESCONOZCO if rnd.random() < desconocimiento else rnd.choice(escala)
        subs.append({**c, 'valor': valor})
    return Eva(factores_eval, subs)


def tabla(cabeceras, filas):
    """Imprime una tabla en markdown, lista para pegar en la documentación."""
    print('| ' + ' | '.join(cabeceras) + ' |')
    print('|' + '|'.join('---' for _ in cabeceras) + '|')
    for f in filas:
        print('| ' + ' | '.join(str(x) for x in f) + ' |')
    print()


def pct(parte, total):
    return f'{100 * parte / total:.1f} %' if total else '—'


def main():
    casos = []
    for perfil in PERFILES:
        for desc in DESCONOCIMIENTOS:
            for imp in IMPORTANCIAS:
                for r in range(REPLICAS):
                    # crc32 y no hash(): hash() aleatoriza las cadenas en cada
                    # proceso y el experimento dejaría de ser reproducible.
                    clave = f'{perfil}|{desc}|{imp}|{r}|{SEMILLA}'.encode()
                    casos.append({
                        'perfil': perfil, 'desc': desc, 'imp': imp,
                        'ev': construir(perfil, desc, imp, zlib.crc32(clave)),
                    })

    print('# Comportamiento del instrumento\n')
    print(f'{len(casos)} evaluaciones sintéticas resueltas con la metodología tal como está, '
          f'sobre el catálogo real ({len(FACTORES)} factores, {len(CATALOGO)} subfactores).')
    print(f'Diseño: {len(PERFILES)} perfiles de cumplimiento × {len(DESCONOCIMIENTOS)} niveles de '
          f'desconocimiento × {len(IMPORTANCIAS)} formas de asignar importancia × {REPLICAS} réplicas.')
    print(f'Semilla {SEMILLA}: el experimento es reproducible.\n')

    for c in casos:
        c['res'] = sv.calcular_resultado_evaluacion(c['ev'])
        c['cod'] = c['res']['recomendacion']['codigo'] or '—'

    total = len(casos)

    # ── 1 · que recomienda ──
    print('## 1. Qué recomienda la metodología\n')
    cuenta = Counter(c['cod'] for c in casos)
    tabla(['Recomendación', 'Evaluaciones', 'Proporción'],
          [[cod, cuenta.get(cod, 0), pct(cuenta.get(cod, 0), total)] for cod in ('A', 'B', 'C')])

    # ── 2 · el desconocimiento mueve el veredicto ──
    print('## 2. Efecto del desconocimiento del evaluador\n')
    print('Proporción de evaluaciones que terminan en cada recomendación según qué parte de los '
          'criterios quedó sin conocer. El software evaluado no cambia entre filas: solo cambia '
          'cuánto se sabe de él.\n')
    filas = []
    for d in DESCONOCIMIENTOS:
        sub = [c for c in casos if c['desc'] == d]
        filas.append([f'{int(d * 100)} %', len(sub)] +
                     [pct(sum(1 for c in sub if c['cod'] == k), len(sub)) for k in ('A', 'B', 'C')])
    tabla(['Sin conocer', 'Evaluaciones', 'A', 'B', 'C'], filas)

    # ── 3 · la calidad real ──
    print('## 3. Efecto de la calidad del software\n')
    print('Lo mismo, pero variando cómo responde el decisor a lo que sí conoce. Es la variable '
          'que un instrumento de evaluación debería seguir.\n')
    filas = []
    for p in PERFILES:
        sub = [c for c in casos if c['perfil'] == p]
        filas.append([p, len(sub)] +
                     [pct(sum(1 for c in sub if c['cod'] == k), len(sub)) for k in ('A', 'B', 'C')])
    tabla(['Perfil de cumplimiento', 'Evaluaciones', 'A', 'B', 'C'], filas)

    # ── 4 · de que factores depende ──
    print('## 4. Qué factores causan la recomendación\n')
    causas = Counter()
    por_subfactores = {}
    for c in casos:
        cod = c['cod']
        criticos = sv.CRITICAS if cod == 'C' else ('Opcional',)
        for f in c['res']['factores']:
            if f['foda_categoria'] in sv.DESFAVORABLES and f['ir_etiqueta'] in criticos:
                causas[f['factor_nombre']] += 1
                por_subfactores[f['factor_nombre']] = f['subfactores_totales']
    tabla(['Factor', 'Subfactores', 'Veces que causa la recomendación', 'Sobre el total'],
          [[nombre, por_subfactores[nombre], veces, pct(veces, total)]
           for nombre, veces in causas.most_common(8)])

    # ── 5 · sensibilidad ──
    print('## 5. De cuántas respuestas depende el veredicto\n')
    muestra = casos[::REPLICAS][:54]
    conteos = [sv.respuestas_determinantes(c['ev'])['total_determinantes'] for c in muestra]
    ninguna = sum(1 for n in conteos if n == 0)
    print(f'Sobre una submuestra de {len(muestra)} evaluaciones, una sola respuesta distinta '
          f'bastaría para cambiar la recomendación en **{pct(len(conteos) - ninguna, len(conteos))}** '
          f'de los casos; de media hay **{sum(conteos) / len(conteos):.1f}** respuestas con ese '
          f'poder de decisión sobre las 61.\n')

    # ── 6 · cobertura ──
    print('## 6. Cuánta información sostiene cada resultado\n')
    sin_conocer = total_resp = 0
    solo_desconocidos = 0
    for c in casos:
        for f in c['res']['factores']:
            if not f['relevante'] or f['ponderacion_global'] is None:
                continue
            sin_conocer += f['subfactores_sin_conocer']
            total_resp += f['subfactores_totales']
            if f['subfactores_sin_conocer'] == f['subfactores_totales']:
                solo_desconocidos += 1
    print(f'- **{pct(sin_conocer, total_resp)}** de las respuestas que entran en los promedios son '
          f'«Desconozco si cumple».')
    print(f'- En **{solo_desconocidos}** ocasiones un factor se clasificó sin conocer ninguno de '
          f'sus criterios: su ponderación de 2,0 y la clasificación desfavorable que produce salen '
          f'enteramente del desconocimiento del evaluador.\n')


if __name__ == '__main__':
    main()
