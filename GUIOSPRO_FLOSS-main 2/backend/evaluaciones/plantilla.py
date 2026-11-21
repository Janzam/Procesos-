# origen: nuevo | evaluación a partir de una plantilla Excel descargable
#
# La plantilla NO tiene nada fijo: se genera en cada descarga a partir del catálogo
# guardado en la base de datos (dimensiones, factores, subfactores, importancia
# sugerida y alcance) y de las escalas definidas en recomendaciones/services.py.
# Al importarla tampoco se calcula nada aquí: este módulo solo traduce el archivo a
# la misma evaluación que construye el asistente, y el resultado sale del motor
# (services.resolver). Si cambia el catálogo o cambian las fórmulas, la plantilla y
# el resultado cambian con ellos sin tocar este archivo.
#
# Reglas de la importación (las mismas del asistente, salvo la exclusión):
#   · Un factor sin importancia y sin ninguna valoración NO entra en el cálculo.
#     Si todos los factores de una dimensión quedan fuera, la dimensión tampoco entra.
#   · Un factor relevante con importancia pero sin ninguna valoración tampoco entra:
#     no hay datos con qué ponderarlo.
#   · Importancia vacía en un factor con valoraciones → la mínima (como el asistente).
#   · Subfactor vacío de un factor que entra → «No cumple» (como el asistente).
#   · Alcance vacío de un factor «Ambos» → Interno (como el asistente).
import hashlib
import io
import unicodedata

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

from factores.models import Factor
from recomendaciones.services import (
    ALCANCE_POR_DEFECTO, ALCANCES_VALIDOS, ESCALA_CUMPLIMIENTO, IMPORTANCIA_POR_DEFECTO,
    NIVELES, VALOR_SIN_RESPUESTA, calcular_importancia_relativa,
)
from .models import CAMPOS_SOFTWARE

HOJA_SOFTWARE, HOJA_FACTORES, HOJA_SUBFACTORES, HOJA_META = 'Software', 'Factores', 'Subfactores', '_catalogo'

ETIQUETAS_SOFTWARE = {
    'software_nombre': 'Nombre del software', 'version': 'Versión', 'licencia': 'Licencia',
    'proveedor': 'Proveedor', 'organizacion': 'Organización', 'evaluador': 'Evaluador',
}

# Formas cortas que también se aceptan al leer (las que muestra el asistente).
SINONIMOS_CUMPLIMIENTO = {'no cumple': 1, 'no lo se': 2, 'desconozco': 2, 'parcial': 3, 'cumple': 4}

AZUL, BLANCO, GRIS, AMARILLO = '1F3864', 'FFFFFF', 'F2F2F2', 'FFF2CC'
_fino = Side(style='thin', color='BFBFBF')
BORDE = Border(left=_fino, right=_fino, top=_fino, bottom=_fino)


class PlantillaInvalida(ValueError):
    """El archivo no es una plantilla de GUIOSAD o tiene valores que no se pueden leer."""

    def __init__(self, errores):
        self.errores = errores if isinstance(errores, list) else [errores]
        super().__init__('; '.join(self.errores))


def _normalizar(texto) -> str:
    t = unicodedata.normalize('NFD', str(texto or '')).encode('ascii', 'ignore').decode()
    return ' '.join(t.lower().replace('«', '').replace('»', '').split())


def _catalogo():
    return list(Factor.objects.select_related('dimension').prefetch_related('subfactores').order_by('id'))


def version_catalogo(factores=None) -> str:
    """Huella del catálogo: cambia si se añade, quita o modifica un factor o subfactor."""
    factores = factores if factores is not None else _catalogo()
    partes = []
    for f in factores:
        partes.append(f'{f.id}|{f.nombre}|{f.dimension.nombre}|{f.importancia_sugerida}|{f.alcance}')
        partes += [f'  {s.id}|{s.nombre}' for s in f.subfactores.all()]
    return hashlib.sha1('\n'.join(partes).encode()).hexdigest()[:10]


# ─────────────────────────────────────────────────────────────────────────────
# Generación
# ─────────────────────────────────────────────────────────────────────────────
def _cabecera(ws, titulos, anchos):
    ws.append(titulos)
    for i, ancho in enumerate(anchos, start=1):
        c = ws.cell(row=1, column=i)
        c.font = Font(bold=True, color=BLANCO)
        c.fill = PatternFill('solid', fgColor=AZUL)
        c.alignment = Alignment(vertical='center', horizontal='center', wrap_text=True)
        c.border = BORDE
        ws.column_dimensions[c.column_letter].width = ancho
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = 'A2'


def _lista(ws, opciones, rango):
    dv = DataValidation(type='list', formula1='"' + ','.join(opciones) + '"', allow_blank=True,
                        showErrorMessage=True, errorTitle='Valor no válido',
                        error='Elija una opción de la lista o deje la celda vacía.')
    ws.add_data_validation(dv)
    dv.add(rango)


def _celda(c, editable=False, centrar=False):
    c.border = BORDE
    c.alignment = Alignment(vertical='top', wrap_text=True, horizontal='center' if centrar else None)
    if editable:
        c.fill = PatternFill('solid', fgColor=AMARILLO)


def generar_plantilla() -> bytes:
    factores = _catalogo()
    version = version_catalogo(factores)
    n_sub = sum(f.subfactores.count() for f in factores)
    dimensiones = list(dict.fromkeys(f.dimension.nombre for f in factores))
    wb = Workbook()

    # Instrucciones
    ws = wb.active
    ws.title = 'Instrucciones'
    ws.column_dimensions['A'].width = 110
    lineas = [
        ('GUIOSAD v2 — Plantilla de evaluación', Font(bold=True, size=15, color=AZUL)),
        (f'Catálogo: {len(dimensiones)} dimensiones, {len(factores)} factores y {n_sub} subfactores '
         f'(versión {version}).', Font(italic=True, color='595959')),
        ('', None),
        ('Cómo llenarla', Font(bold=True, size=12)),
        ('1. En la hoja «Software», escriba los datos del producto que evalúa (todos son opcionales).', None),
        ('2. En la hoja «Factores», elija la importancia de cada factor para su organización '
         '(Irrelevante, Opcional, Importante o Fundamental). En los factores de alcance «Ambos», '
         'indique además si el uso es Interno o Externo.', None),
        ('3. En la hoja «Subfactores», elija el grado de cumplimiento de cada subfactor.', None),
        ('4. Guarde el archivo y súbalo en GUIOSAD (menú «Evaluar con plantilla»). '
         'El sistema calcula el resultado y lo muestra al instante.', None),
        ('', None),
        ('Qué pasa con lo que deje vacío', Font(bold=True, size=12)),
        ('• Un factor sin importancia y sin ninguna valoración queda FUERA del cálculo. Si deja vacía '
         'una dimensión entera, la dimensión tampoco entra.', None),
        ('• Si un factor tiene importancia pero ningún subfactor valorado, también queda fuera.', None),
        (f'• Si valora subfactores pero deja la importancia vacía, se usa la mínima '
         f'(«{NIVELES[IMPORTANCIA_POR_DEFECTO - 1]}»), igual que en el asistente.', None),
        (f'• Un subfactor vacío de un factor que sí entra se cuenta como '
         f'«{ESCALA_CUMPLIMIENTO[VALOR_SIN_RESPUESTA - 1]}», igual que en el asistente.', None),
        (f'• Un factor «Ambos» sin alcance elegido se toma como {ALCANCE_POR_DEFECTO}.', None),
        ('', None),
        ('Escala de cumplimiento (hoja «Subfactores»)', Font(bold=True, size=12)),
        *[(f'{i} = {e}', None) for i, e in enumerate(ESCALA_CUMPLIMIENTO, start=1)],
        ('', None),
        ('Importancia para su organización (hoja «Factores»)', Font(bold=True, size=12)),
        *[(f'{i} = {n}', None) for i, n in enumerate(NIVELES, start=1)],
        ('', None),
        ('No modifique las columnas de identificadores (ID): el sistema las usa para reconocer cada '
         'factor y subfactor. Puede escribir el número (1-4) o elegir el texto de la lista.',
         Font(italic=True, color='595959')),
    ]
    for texto, fuente in lineas:
        ws.append([texto])
        c = ws.cell(row=ws.max_row, column=1)
        c.alignment = Alignment(wrap_text=True, vertical='top')
        if fuente:
            c.font = fuente

    # Software
    ws = wb.create_sheet(HOJA_SOFTWARE)
    _cabecera(ws, ['Dato', 'Valor'], [26, 60])
    for campo in CAMPOS_SOFTWARE:
        ws.append([ETIQUETAS_SOFTWARE[campo], ''])
        _celda(ws.cell(row=ws.max_row, column=1))
        _celda(ws.cell(row=ws.max_row, column=2), editable=True)

    # Factores
    ws = wb.create_sheet(HOJA_FACTORES)
    _cabecera(ws, ['ID factor', 'Dimensión', 'Factor', 'Importancia sugerida', 'Alcance del factor',
                   'Importancia para su organización', "Alcance elegido (solo factores 'Ambos')"],
              [10, 18, 42, 14, 12, 22, 22])
    for f in factores:
        ws.append([f.id, f.dimension.nombre, f.nombre, NIVELES[f.importancia_sugerida - 1], f.alcance, '',
                   '' if f.alcance == 'Ambos' else '—'])
        fila = ws.max_row
        for col in range(1, 8):
            _celda(ws.cell(row=fila, column=col), editable=col == 6 or (col == 7 and f.alcance == 'Ambos'),
                   centrar=col in (1, 4, 5, 6, 7))
        ws.cell(row=fila, column=1).fill = PatternFill('solid', fgColor=GRIS)
    if factores:
        _lista(ws, NIVELES, f'F2:F{len(factores) + 1}')
        _lista(ws, list(ALCANCES_VALIDOS), f'G2:G{len(factores) + 1}')

    # Subfactores
    ws = wb.create_sheet(HOJA_SUBFACTORES)
    _cabecera(ws, ['ID subfactor', 'ID factor', 'Dimensión', 'Factor', 'Subfactor', 'Cumplimiento'],
              [11, 9, 16, 28, 70, 24])
    for f in factores:
        for s in f.subfactores.all():
            ws.append([s.id, f.id, f.dimension.nombre, f.nombre, s.nombre, ''])
            fila = ws.max_row
            for col in range(1, 7):
                _celda(ws.cell(row=fila, column=col), editable=col == 6, centrar=col in (1, 2, 6))
            for col in (1, 2):
                ws.cell(row=fila, column=col).fill = PatternFill('solid', fgColor=GRIS)
    if n_sub:
        _lista(ws, ESCALA_CUMPLIMIENTO, f'F2:F{n_sub + 1}')

    # Huella del catálogo con el que se generó (oculta)
    ws = wb.create_sheet(HOJA_META)
    ws.append(['version_catalogo', version])
    ws.sheet_state = 'hidden'

    wb.active = 0               # se abre en «Instrucciones»
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# Lectura
# ─────────────────────────────────────────────────────────────────────────────
def _entero(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _leer_nivel(valor, etiquetas, sinonimos=None):
    """Acepta el número (1-4) o el texto de la lista. Devuelve (valor|None, error|None)."""
    if valor is None or str(valor).strip() in ('', '—', '-'):
        return None, None
    n = _entero(valor)
    if n is not None:
        return (n, None) if 1 <= n <= len(etiquetas) else (None, f'«{valor}» está fuera de la escala 1-{len(etiquetas)}')
    t = _normalizar(valor)
    for i, e in enumerate(etiquetas, start=1):
        if t == _normalizar(e):
            return i, None
    if sinonimos and t in sinonimos:
        return sinonimos[t], None
    return None, f'«{valor}» no es una opción válida'


def _nombre_evaluacion(sw: dict) -> str:
    """Mismo nombre que compone el asistente: «Moodle 4.3 — Organización»."""
    base = ' '.join(x for x in (sw.get('software_nombre'), sw.get('version')) if x).strip()
    if not base:
        return 'Evaluación sin nombre'
    return f"{base} — {sw['organizacion']}" if sw.get('organizacion') else base


def leer_plantilla(archivo) -> tuple[dict, dict]:
    """
    Convierte una plantilla llena en el cuerpo que acepta POST /api/evaluaciones/ y en
    un resumen de lo que entró y lo que quedó fuera. Lanza PlantillaInvalida si el
    archivo no se puede usar.
    """
    try:
        wb = load_workbook(archivo, data_only=True, read_only=True)
    except Exception:
        raise PlantillaInvalida('El archivo no es un libro de Excel (.xlsx) válido.')
    faltan = [h for h in (HOJA_SOFTWARE, HOJA_FACTORES, HOJA_SUBFACTORES) if h not in wb.sheetnames]
    if faltan:
        raise PlantillaInvalida(f'El archivo no es una plantilla de GUIOSAD: faltan las hojas {", ".join(faltan)}. '
                                'Descargue la plantilla desde el sistema y llénela.')

    factores = _catalogo()
    por_id = {f.id: f for f in factores}
    sub_a_factor = {s.id: f.id for f in factores for s in f.subfactores.all()}
    errores, avisos = [], []

    version = None
    if HOJA_META in wb.sheetnames:
        for fila in wb[HOJA_META].iter_rows(values_only=True):
            if fila and fila[0] == 'version_catalogo':
                version = fila[1]
    if version and version != version_catalogo(factores):
        avisos.append('La plantilla se generó con una versión anterior del catálogo. Se usaron los factores y '
                      'subfactores que siguen existiendo; descargue la plantilla nueva para evaluar los demás.')

    # Software (se busca por la etiqueta, no por la fila)
    por_etiqueta = {_normalizar(v): k for k, v in ETIQUETAS_SOFTWARE.items()}
    software = {c: '' for c in CAMPOS_SOFTWARE}
    for fila in wb[HOJA_SOFTWARE].iter_rows(min_row=2, values_only=True):
        if fila and fila[0] is not None and _normalizar(fila[0]) in por_etiqueta:
            valor = fila[1] if len(fila) > 1 and fila[1] is not None else ''
            software[por_etiqueta[_normalizar(fila[0])]] = str(valor).strip()[:200]

    # Factores
    importancias, alcances = {}, {}
    for n, fila in enumerate(wb[HOJA_FACTORES].iter_rows(min_row=2, values_only=True), start=2):
        if not fila or fila[0] is None:
            continue
        fid = _entero(fila[0])
        if fid not in por_id:
            avisos.append(f'Factores, fila {n}: el factor con ID {fila[0]} ya no existe en el catálogo y se ignoró.')
            continue
        imp, err = _leer_nivel(fila[5] if len(fila) > 5 else None, NIVELES)
        if err:
            errores.append(f'Factores, fila {n} ({por_id[fid].nombre}): importancia {err}.')
        elif imp:
            importancias[fid] = imp
        alc = fila[6] if len(fila) > 6 else None
        if alc not in (None, '', '—', '-') and por_id[fid].alcance == 'Ambos':
            elegido = next((a for a in ALCANCES_VALIDOS if _normalizar(a) == _normalizar(alc)), None)
            if elegido:
                alcances[fid] = elegido
            else:
                errores.append(f'Factores, fila {n} ({por_id[fid].nombre}): el alcance «{alc}» debe ser '
                               f'{" o ".join(ALCANCES_VALIDOS)}.')

    # Subfactores
    valores = {}
    for n, fila in enumerate(wb[HOJA_SUBFACTORES].iter_rows(min_row=2, values_only=True), start=2):
        if not fila or fila[0] is None:
            continue
        sid = _entero(fila[0])
        if sid not in sub_a_factor:
            avisos.append(f'Subfactores, fila {n}: el subfactor con ID {fila[0]} ya no existe y se ignoró.')
            continue
        v, err = _leer_nivel(fila[5] if len(fila) > 5 else None, ESCALA_CUMPLIMIENTO, SINONIMOS_CUMPLIMIENTO)
        if err:
            errores.append(f'Subfactores, fila {n}: cumplimiento {err}.')
        elif v:
            valores[sid] = v

    if errores:
        raise PlantillaInvalida(errores)

    # Construcción de la evaluación con las reglas del asistente
    payload_factores, incluidos, excluidos = [], [], []
    for f in factores:
        subs = list(f.subfactores.all())
        respondidos = {s.id: valores[s.id] for s in subs if s.id in valores}
        imp = importancias.get(f.id)
        if imp is None and not respondidos:
            excluidos.append({'factor': f.nombre, 'dimension': f.dimension.nombre,
                              'motivo': 'Sin importancia ni valoraciones'})
            continue
        if imp is None:
            imp = IMPORTANCIA_POR_DEFECTO
            avisos.append(f'«{f.nombre}» no tiene importancia: se usó «{NIVELES[imp - 1]}», como en el asistente.')
        relevante = calcular_importancia_relativa(f.importancia_sugerida, imp)['relevante']
        if relevante and not respondidos:
            excluidos.append({'factor': f.nombre, 'dimension': f.dimension.nombre,
                              'motivo': 'Tiene importancia pero ningún subfactor valorado'})
            continue
        alcance = None
        if f.alcance == 'Ambos':
            alcance = alcances.get(f.id, ALCANCE_POR_DEFECTO)
        sin_responder = [s for s in subs if s.id not in respondidos] if relevante else []
        if sin_responder:
            avisos.append(f'«{f.nombre}»: {len(sin_responder)} subfactor(es) sin valorar se contaron como '
                          f'«{ESCALA_CUMPLIMIENTO[VALOR_SIN_RESPUESTA - 1]}».')
        payload_factores.append({
            'factor_id': f.id,
            'importancia_decisor': imp,
            'alcance_elegido': alcance,
            'subfactores': [{'subfactor_id': s.id, 'valor': respondidos.get(s.id, VALOR_SIN_RESPUESTA),
                             'origen': 'manual'} for s in subs] if relevante else [],
        })
        incluidos.append(f.nombre)

    if not payload_factores:
        raise PlantillaInvalida('La plantilla no tiene ningún factor con datos: elija la importancia y valore los '
                                'subfactores de al menos un factor.')

    dims_con_datos = {por_id[p['factor_id']].dimension.nombre for p in payload_factores}
    dimensiones = list(dict.fromkeys(f.dimension.nombre for f in factores))
    resumen = {
        'factores_incluidos': incluidos,
        'factores_excluidos': excluidos,
        'dimensiones_excluidas': [d for d in dimensiones if d not in dims_con_datos],
        'subfactores_valorados': len(valores),
        'avisos': avisos,
    }
    payload = {'nombre': _nombre_evaluacion(software), **software, 'factores': payload_factores}
    return payload, resumen
