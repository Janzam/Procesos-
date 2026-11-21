# Pruebas de la evaluación por plantilla. Se ejecutan con:
#   python manage.py test evaluaciones
# Usan una base de datos de prueba propia: no tocan las evaluaciones guardadas.
import io
import random
from unittest import mock

from django.test import TestCase
from openpyxl import load_workbook
from rest_framework.test import APIClient

from factores.models import Factor
from recomendaciones import services
from . import plantilla


def _llenar(importancias=None, valores=None, alcances=None, software=None, meta=None):
    """Descarga la plantilla y la devuelve llena como archivo .xlsx en memoria."""
    wb = load_workbook(io.BytesIO(plantilla.generar_plantilla()))
    for fila in wb['Software'].iter_rows(min_row=2):
        clave = next((k for k, v in plantilla.ETIQUETAS_SOFTWARE.items() if v == fila[0].value), None)
        if software and clave in software:
            fila[1].value = software[clave]
    for fila in wb['Factores'].iter_rows(min_row=2):
        fid = fila[0].value
        if importancias and fid in importancias:
            fila[5].value = importancias[fid]
        if alcances and fid in alcances:
            fila[6].value = alcances[fid]
    for fila in wb['Subfactores'].iter_rows(min_row=2):
        if valores and fila[0].value in valores:
            fila[5].value = valores[fila[0].value]
    if meta:
        wb['_catalogo']['B1'] = meta
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    buf.name = 'plantilla.xlsx'
    return buf


class PlantillaTests(TestCase):
    fixtures = ['fixtures/factores.json', 'fixtures/subfactores.json']

    def setUp(self):
        self.api = APIClient()
        self.factores = list(Factor.objects.prefetch_related('subfactores').order_by('id'))
        rnd = random.Random(7)
        self.imp = {f.id: rnd.randint(1, 4) for f in self.factores}
        self.val = {s.id: rnd.randint(1, 4) for f in self.factores for s in f.subfactores.all()}
        self.alc = {f.id: 'Externo' for f in self.factores if f.alcance == 'Ambos'}

    def importar(self, archivo):
        return self.api.post('/api/evaluaciones/importar/', {'archivo': archivo}, format='multipart')

    def payload_asistente(self, factores=None, valores=None):
        """El mismo cuerpo que envía el asistente (EvaluacionPage.handleCalcular)."""
        valores = valores or self.val
        cuerpo = []
        for f in factores or self.factores:
            imp = self.imp[f.id]
            relevante = services.calcular_importancia_relativa(f.importancia_sugerida, imp)['relevante']
            cuerpo.append({
                'factor_id': f.id, 'importancia_decisor': imp,
                'alcance_elegido': self.alc.get(f.id, 'Interno') if f.alcance == 'Ambos' else None,
                'subfactores': [{'subfactor_id': s.id, 'valor': valores.get(s.id, 1)}
                                for s in f.subfactores.all()] if relevante else [],
            })
        return {'nombre': 'Asistente', 'factores': cuerpo}

    def test_plantilla_refleja_el_catalogo(self):
        wb = load_workbook(io.BytesIO(self.api.get('/api/evaluaciones/plantilla/').content))
        self.assertEqual(wb['Factores'].max_row - 1, len(self.factores))
        self.assertEqual(wb['Subfactores'].max_row - 1, sum(f.subfactores.count() for f in self.factores))

    def test_mismo_resultado_que_el_asistente(self):
        r = self.importar(_llenar(self.imp, self.val, self.alc, {'software_nombre': 'Moodle', 'version': '4.3'}))
        self.assertEqual(r.status_code, 201, r.content)
        esperado = self.api.post('/api/evaluaciones/', self.payload_asistente(), format='json').json()['resultado']
        self.assertEqual(r.json()['resultado'], esperado)
        self.assertEqual(r.json()['resumen']['factores_excluidos'], [])

    def test_acepta_textos_de_la_lista(self):
        textos_imp = {k: services.NIVELES[v - 1] for k, v in self.imp.items()}
        textos_val = {k: services.ESCALA_CUMPLIMIENTO[v - 1] for k, v in self.val.items()}
        r = self.importar(_llenar(textos_imp, textos_val, self.alc))
        esperado = self.api.post('/api/evaluaciones/', self.payload_asistente(), format='json').json()['resultado']
        self.assertEqual(r.json()['resultado'], esperado)

    def test_dimension_vacia_queda_fuera_del_calculo(self):
        dim = self.factores[-1].dimension.nombre
        fuera = {f.id for f in self.factores if f.dimension.nombre == dim}
        subs_fuera = {s.id for f in self.factores if f.id in fuera for s in f.subfactores.all()}
        r = self.importar(_llenar({k: v for k, v in self.imp.items() if k not in fuera},
                                  {k: v for k, v in self.val.items() if k not in subs_fuera}, self.alc)).json()
        self.assertEqual(r['resumen']['dimensiones_excluidas'], [dim])
        self.assertFalse(any(f['dimension'] == dim for f in r['resultado']['factores']))
        quedan = [f for f in self.factores if f.id not in fuera]
        esperado = self.api.post('/api/evaluaciones/', self.payload_asistente(quedan), format='json').json()
        self.assertEqual(r['resultado'], esperado['resultado'])

    def test_subfactor_vacio_cuenta_como_no_cumple(self):
        val = dict(self.val)
        quitado = next(iter(val))
        del val[quitado]
        r = self.importar(_llenar(self.imp, val, self.alc)).json()
        esperado = self.api.post('/api/evaluaciones/', self.payload_asistente(valores=val), format='json').json()
        self.assertEqual(r['resultado'], esperado['resultado'])

    def test_si_cambia_una_regla_del_motor_cambia_el_resultado(self):
        antes = self.importar(_llenar(self.imp, self.val, self.alc)).json()
        with mock.patch.object(services, 'UMBRAL', 3.9):
            despues = self.importar(_llenar(self.imp, self.val, self.alc)).json()
            esperado = self.api.post('/api/evaluaciones/', self.payload_asistente(), format='json').json()
        self.assertEqual(despues['resultado'], esperado['resultado'])
        self.assertNotEqual(antes['resultado'], despues['resultado'])

    def test_valor_invalido_explica_el_error(self):
        val = dict(self.val)
        val[next(iter(val))] = 9
        r = self.importar(_llenar(self.imp, val, self.alc))
        self.assertEqual(r.status_code, 400)
        self.assertIn('fuera de la escala', str(r.json()))

    def test_plantilla_vacia_o_archivo_ajeno(self):
        self.assertEqual(self.importar(_llenar()).status_code, 400)
        ajeno = io.BytesIO(b'no es excel'); ajeno.name = 'otro.xlsx'
        self.assertEqual(self.importar(ajeno).status_code, 400)

    def test_avisa_si_el_catalogo_cambio(self):
        r = self.importar(_llenar(self.imp, self.val, self.alc, meta='antigua')).json()
        self.assertTrue(any('versión anterior del catálogo' in a for a in r['resumen']['avisos']))
