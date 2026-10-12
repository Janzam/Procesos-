# -*- coding: utf-8 -*-
"""
Catalogo de la metodologia cargado en memoria, sin Django ni base de datos.

Lo usan las pruebas del motor y el experimento de contraste de criterios. Lee las
mismas fixtures con las que se siembra PostgreSQL, de modo que lo que se mide
fuera del sistema y lo que el sistema calcula provienen del mismo dato.

Los objetos de abajo imitan la interfaz minima que consume instantanea(): un
manager con values_list()/select_related()/all(). No son modelos de Django.
"""
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(os.path.dirname(AQUI), 'fixtures')


class Dim:
    def __init__(self, n):
        self.nombre = n


class Fac:
    def __init__(self, i, n, is_, alc, dim):
        self.id = i
        self.nombre = n
        self.importancia_sugerida = is_
        self.alcance = alc
        self.dimension = Dim(dim)


class EF:
    """Equivalente local de EvaluacionFactor."""

    def __init__(self, factor, id_dec, alc=None):
        self.factor = factor
        self.importancia_decisor = id_dec
        self.alcance_elegido = alc


class Rel:
    """Manager minimo: solo lo que el motor llega a invocar."""

    def __init__(self, filas):
        self._f = filas

    def values_list(self, *campos):
        return [tuple(f[c] for c in campos) for f in self._f]

    def select_related(self, *a):
        return self

    def all(self):
        return self._f


class Eva:
    """Equivalente local de Evaluacion."""

    _siguiente = 0

    def __init__(self, factores_eval, subfactores):
        Eva._siguiente += 1
        self.id = Eva._siguiente
        self.factores_eval = Rel(factores_eval)
        self.subfactores_eval = Rel(subfactores)


def _leer(nombre):
    with open(os.path.join(FIXTURES, nombre), encoding='utf-8') as f:
        return json.load(f)


def cargar():
    """
    Reconstruye el catalogo desde las fixtures de siembra.

    Devuelve (factores, catalogo), donde cada entrada del catalogo trae las claves
    que instantanea() espera de una fila de EvaluacionSubfactor.
    """
    registros = _leer('factores.json')
    dimensiones = {r['pk']: r['fields']['nombre']
                   for r in registros if r['model'] == 'factores.dimension'}

    factores, por_id = [], {}
    for r in registros:
        if r['model'] != 'factores.factor':
            continue
        c = r['fields']
        fac = Fac(r['pk'], c['nombre'], c['importancia_sugerida'],
                  c['alcance'], dimensiones[c['dimension']])
        factores.append(fac)
        por_id[r['pk']] = fac

    catalogo = []
    for r in _leer('subfactores.json'):
        c = r['fields']
        catalogo.append({
            'subfactor_id': r['pk'],
            'subfactor__factor_id': c['factor'],
            'subfactor__nombre': c['nombre'],
            'factor': por_id[c['factor']].nombre,
        })

    factores.sort(key=lambda f: f.id)
    catalogo.sort(key=lambda c: c['subfactor_id'])
    return factores, catalogo
