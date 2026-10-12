# -*- coding: utf-8 -*-
"""Prueba del motor de calculo contra el catalogo real de la metodologia.

No levanta Django ni necesita base de datos: construye objetos con la misma
interfaz que consume instantanea() y carga los 18 factores y 61 subfactores
desde las mismas fixtures con las que se siembra PostgreSQL, de modo que la
prueba y el sistema en ejecucion comparten los datos.
"""
import io, sys, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Se ejecuta con:  python backend/recomendaciones/pruebas_motor.py
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))

from recomendaciones import services as sv                        # noqa: E402
from recomendaciones.catalogo_local import cargar, EF, Eva   # noqa: E402

fallos = []


def ok(cond, etiqueta, detalle=''):
    print(('  OK   ' if cond else '  FALLA') + f' {etiqueta}' + (f'  ({detalle})' if detalle else ''))
    if not cond:
        fallos.append(etiqueta)


# ─── catalogo real, compartido con el experimento ───────────────────────────
FACTORES, CATALOGO = cargar()
print(f'catálogo: {len(FACTORES)} factores · {len(CATALOGO)} subfactores\n')

print('=== el criterio de la tesis no se ha alterado (RNF-15) ===')
esperada = [
    ['Irrelevante', 'Irrelevante', 'Opcional', 'Opcional'],
    ['Irrelevante', 'Opcional', 'Opcional', 'Importante'],
    ['Opcional', 'Opcional', 'Importante', 'Importante'],
    ['Opcional', 'Importante', 'Importante', 'Fundamental'],
]
obtenida = [[c['etiqueta'] for c in fila] for fila in sv.matriz_importancia_relativa()]
ok(obtenida == esperada, 'la matriz IR reproduce la Figura 5.10', '')
ok(sv.TEXTOS_RECOMENDACION['A'].startswith('Recomendación A: Adoptar'), 'texto A intacto')
ok(sv.UMBRAL == 3.0, 'el umbral de la Ecuacion 5.3 sigue en 3,0')
ok(sv.VALOR_DESCONOZCO == 2, '«Desconozco si cumple» sigue valiendo 2 en el promedio')

# No puede existir una formula alternativa: ninguna funcion del motor acepta un
# parametro que cambie el calculo.
_motor_txt = open(os.path.join(AQUI, 'services.py'), encoding='utf-8').read()
ok('CRITERIOS' not in _motor_txt and 'guiosad_v2' not in _motor_txt,
   'no queda ninguna variante de la formula en el motor')

print('\n=== lo que documenta la Tabla 12 se cumple en el motor ===')
alcanzables = set()
for f in FACTORES:
    for d in range(1, 5):
        alcanzables.add(sv.calcular_importancia_relativa(f.importancia_sugerida, d)['etiqueta'])
ok('Fundamental' not in alcanzables, 'Fundamental es inalcanzable con el catálogo real', str(sorted(alcanzables)))

indescartables = [f.nombre for f in FACTORES
                  if sv.calcular_importancia_relativa(f.importancia_sugerida, 1)['relevante']]
ok(len(indescartables) == 9, 'nueve factores no se pueden descartar', f'{len(indescartables)}')

de_un_subfactor = [f.nombre for f in FACTORES
                   if sum(1 for c in CATALOGO if c['subfactor__factor_id'] == f.id) == 1]
ok(len(de_un_subfactor) == 5, 'cinco factores dependen de una sola pregunta', ', '.join(de_un_subfactor))

# en esos factores, "Desconozco" (2) y "No cumple" (1) dan el mismo veredicto
a = sv.clasificar_foda(sv.calcular_ponderacion_global([1]), 'Externo')
b = sv.clasificar_foda(sv.calcular_ponderacion_global([2]), 'Externo')
ok(a['categoria'] == b['categoria'] == 'Amenaza',
   'en esos factores «Desconozco» equivale a «No cumple»', f"{a['categoria']} / {b['categoria']}")

print('\n=== el diagnóstico explica el resultado sin recalcularlo ===')
# El decisor declara todo importante y responde bien, salvo desconocimiento en los
# dos factores tecnologicos mas extensos y en el unico criterio de Mantenibilidad.
factores_eval = [EF(f, 3, 'Interno' if f.alcance == 'Ambos' else None) for f in FACTORES]
subs = []
for c in CATALOGO:
    if c['factor'] in ('Documentación', 'Compatibilidad'):
        valor = 2 if (c['subfactor_id'] % 2 == 0) else 4      # mitad sin conocer
    elif c['factor'] == 'Mantenibilidad':
        valor = 2                                            # su unica pregunta, sin conocer
    else:
        valor = 4
    subs.append({**c, 'valor': valor})

ev = Eva(factores_eval, subs)
res = sv.calcular_resultado_evaluacion(ev)
dia = sv.diagnostico(ev)
print(f"    recomendación {res['recomendacion']['codigo']} · {dia['titulo']}")
print(f"    {dia['resumen']}")

ok(dia['recomendacion'] == res['recomendacion']['codigo'],
   'el diagnóstico parte del resultado ya calculado, no de otro')
ok(len(dia['causantes']) > 0, 'enumera los factores que causan la recomendación',
   str(len(dia['causantes'])))
ok(all(c['categoria'] in sv.DESFAVORABLES for c in dia['causantes']),
   'y todos ellos son desfavorables')
ok(all(c['ir_etiqueta'] in sv.CRITICAS for c in dia['causantes']),
   'y críticos, que es lo que provoca la C')

_mant = next((c for c in dia['causantes'] if c['factor_nombre'] == 'Mantenibilidad'), None)
ok(_mant is not None, 'Mantenibilidad aparece entre los causantes')
if _mant:
    print(f"    · {_mant['factor_nombre']}: {_mant['observacion']}")
    ok('Desconozco' in _mant['observacion'],
       'y se advierte de que su clasificación sale del desconocimiento, no de un incumplimiento')

ok(dia['cobertura_global'] is not None and dia['cobertura_global'] < 1,
   'informa de la cobertura real de la evaluación', str(dia['cobertura_global']))
ok(any('Desconozco' in a for a in dia['avisos']), 'y avisa de cuánto pesa lo que no se sabe')

# Lo esencial: el diagnostico no cambia el resultado.
ok(sv.calcular_resultado_evaluacion(ev)['recomendacion']['codigo'] == res['recomendacion']['codigo'],
   'tras diagnosticar, el resultado sigue siendo el mismo')

print('\n=== respuestas determinantes (RF-23) ===')
# evaluacion casi perfecta: una sola respuesta mala decide el resultado
subs2 = [{**c, 'valor': 1 if c['factor'] == 'Mantenibilidad' else 4} for c in CATALOGO]
ev2 = Eva(factores_eval, subs2)
det = sv.respuestas_determinantes(ev2)
print(f"    recomendación actual: {det['recomendacion_actual']} · "
      f"{det['total_determinantes']} de {det['total_respuestas']} respuestas la deciden")
for d in det['determinantes']:
    print(f"    · {d['factor_nombre']}: {d['valor_actual']} → {d['valor_alternativo']} "
          f"cambiaría la recomendación a {d['recomendacion_resultante']}")
ok(det['recomendacion_actual'] == 'C', 'una sola respuesta desfavorable basta para llegar a C')
ok(det['total_determinantes'] == 1, 'el motor identifica esa unica respuesta',
   str(det['total_determinantes']))

print('\n=== plan mínimo (RF-24) ===')
plan = sv.plan_minimo(ev2)
print(f"    actual {plan['recomendacion_actual']} → objetivo {plan['objetivo']} · alcanzable: {plan['alcanzable']}")
for b in plan['bloqueantes']:
    print(f"    · {b['factor_nombre']} ({b['categoria']}, {b['ir_etiqueta']}): "
          f"ponderación {b['ponderacion_actual']} → {b['ponderacion_objetivo']}, "
          f"{b['subfactores_a_mejorar']} de {b['subfactores_totales']} subfactores a mejorar")
ok(plan['objetivo'] == 'A', 'el objetivo se calcula y no se supone', str(plan['objetivo']))
ok(len(plan['bloqueantes']) == 1 and plan['alcanzable'], 'el bloqueante es único y salvable')

print('\n=== un alcance inválido es un error explícito ===')
try:
    sv.clasificar_foda(3.5, 'Ambos')
    ok(False, 'un alcance sin resolver debe fallar')
except ValueError as e:
    ok('Ambos' in str(e), 'un alcance sin resolver lanza ValueError', str(e)[:60])

print('\n=== el asistente con IA no participa en el calculo ===')
# La garantia mas importante del diseno: services.py no importa ia.py. Si alguien
# lo hiciera, el motor dejaria de ser determinista y esta prueba lo detecta.
ok('import ia' not in _motor_txt and 'from . import ia' not in _motor_txt and 'from .ia' not in _motor_txt,
   'services.py no importa el modulo de IA')
ok('anthropic' not in _motor_txt, 'services.py no menciona al proveedor del modelo')

# El modulo de IA se puede cargar sin Django configurado solo hasta el punto de
# necesitar los ajustes, asi que se prueba su logica pura por separado.
import types  # noqa: E402

_ia = types.ModuleType('ia_aislado')
_fuente = open(os.path.join(AQUI, 'ia.py'), encoding='utf-8').read()
# Se sustituye la dependencia de Django por un objeto de ajustes minimo.
_fuente = _fuente.replace('from django.conf import settings',
                          'class settings:\n    IA_HABILITADA = True\n    ANTHROPIC_API_KEY = ""')
exec(compile(_fuente, 'ia.py', 'exec'), _ia.__dict__)

ok(_ia.disponible() is False, 'sin credencial el asistente se declara no disponible')
est = _ia.estado()
ok(est['disponible'] is False and 'ANTHROPIC_API_KEY' in est['motivo'],
   'y explica por que', est['motivo'])

# Validacion de lo que devuelve el modelo: el catalogo lo decide el servidor, no el modelo.
_subs = [{'id': 10, 'nombre': 'Criterio uno'}, {'id': 11, 'nombre': 'Criterio dos'}]
_ia._llamar = lambda *a, **k: json.dumps({'valoraciones': [
    {'subfactor_id': 10, 'valor': 3, 'confianza': 'media', 'justificacion': 'Correcta.'},
    {'subfactor_id': 10, 'valor': 4, 'confianza': 'alta', 'justificacion': 'Duplicada.'},
    {'subfactor_id': 99, 'valor': 4, 'confianza': 'alta', 'justificacion': 'Fuera de catalogo.'},
    {'subfactor_id': 11, 'valor': 9, 'confianza': 'alta', 'justificacion': 'Fuera de escala.'},
    {'subfactor_id': 11, 'valor': 2, 'confianza': 'inventada', 'justificacion': 'Confianza invalida.'},
]})
_props = _ia.sugerir_valoraciones({'software_nombre': 'X'}, 'Factor', _subs)
_ids = [p['subfactor_id'] for p in _props]
ok(_ids == [10, 11], 'se descartan duplicados y subfactores fuera de catalogo', str(_ids))
ok(all(1 <= p['valor'] <= 4 for p in _props), 'se descartan los valores fuera de escala')
ok(_props[1]['confianza'] == 'baja', 'una confianza no prevista se degrada a «baja»')
ok(_props[0]['valor_etiqueta'] == 'Cumple parcialmente', 'la etiqueta corresponde a la escala')

_ia._llamar = lambda *a, **k: 'esto no es JSON'
try:
    _ia.sugerir_valoraciones({'software_nombre': 'X'}, 'Factor', _subs)
    ok(False, 'una respuesta no-JSON debe fallar de forma controlada')
except _ia.IANoDisponible:
    ok(True, 'una respuesta no-JSON falla de forma controlada')

print()
print('RESULTADO:', 'sin fallos' if not fallos else f'{len(fallos)} fallos -> ' + '; '.join(fallos))
