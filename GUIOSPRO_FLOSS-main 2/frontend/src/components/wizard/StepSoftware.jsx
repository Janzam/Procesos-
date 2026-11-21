// Paso inicial: una portada con buscador de evaluaciones y accesos rápidos, la
// ficha del software a evaluar (todo opcional) y, debajo, las evaluaciones
// recientes o las que coinciden con la búsqueda, por si se quiere continuar una.
import { useState, useEffect, useRef } from 'react'
import { nombreEvaluacion } from '../../utils/software.js'
import { getHistorial, getEvaluacion } from '../../api/guiosad.js'
import { REC_V, REC_CORTO } from '../../utils/recomendacion.js'
import { exportarTodas, precargarExportacion } from '../../utils/exportacion.js'
import { fechaCorta } from '../../utils/fecha.js'
import { IcoBuscar, IcoPanel, IcoHistorial, IcoEditar, IcoPdf, IcoExcel, IcoMas, IcoSubir } from '../Iconos.jsx'

const LICENCIAS = [
  'GPL / AGPL',
  'LGPL',
  'MIT',
  'Apache 2.0',
  'BSD',
  'MPL',
  'Otra licencia libre',
  'Propietaria / mixta',
]

function Campo({ etiqueta, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
    </label>
  )
}

export default function StepSoftware({ software, onChange, onStart, onReabrir, onIr, onError, plantilla = true }) {
  const set = (campo) => (e) => onChange({ ...software, [campo]: e.target.value })
  const [historial, setHistorial] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [exportando, setExportando] = useState(null)
  const nombreRef = useRef(null)

  useEffect(() => {
    let vigente = true
    getHistorial().then(h => { if (vigente) setHistorial(h) }).catch(() => {})
    precargarExportacion()
    return () => { vigente = false }
  }, [])

  const q = busqueda.trim().toLowerCase()
  const coincide = e => [e.nombre, e.software_nombre, e.organizacion, e.evaluador]
    .some(v => (v || '').toLowerCase().includes(q))
  // Sin búsqueda, las seis más recientes; buscando, hasta doce coincidencias.
  const LIMITE = q ? 12 : 6
  const candidatas = q ? historial.filter(coincide) : historial
  const mostradas = candidatas.slice(0, LIMITE)
  const ocultas = candidatas.length - mostradas.length

  // Informe o libro con TODAS las evaluaciones guardadas: se piden los
  // resultados completos y se entregan en un solo archivo.
  async function descargarTodas(tipo) {
    if (!historial.length) { onError?.('Todavía no hay evaluaciones que descargar.'); return }
    setExportando(tipo)
    try {
      const detalles = await Promise.all(historial.map(e => getEvaluacion(e.id)))
      await exportarTodas(tipo, historial, detalles)
    } catch (e) {
      onError?.(e.message)
    } finally {
      setExportando(null)
    }
  }

  // Lo buscado no existe: se toma como nombre del software nuevo.
  function evaluarBuscado() {
    onChange({ ...software, nombre: busqueda.trim() })
    setBusqueda('')
    nombreRef.current?.focus()
    nombreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const ACCESOS = [
    { id: 'panel', etiqueta: 'Panel', tono: 'azul', Icono: IcoPanel, hacer: () => onIr?.('dashboard') },
    { id: 'historial', etiqueta: 'Historial', tono: 'morado', Icono: IcoHistorial, hacer: () => onIr?.('historial') },
    ...(plantilla ? [{ id: 'plantilla', etiqueta: 'Desde plantilla', tono: 'turquesa', Icono: IcoSubir, hacer: () => onIr?.('importar'),
      pista: 'Evaluar subiendo la plantilla Excel llena' }] : []),
    { id: 'ultima', etiqueta: 'Última evaluación', tono: 'turquesa', Icono: IcoEditar,
      hacer: () => onReabrir?.(historial[0].id), inactivo: !historial.length,
      pista: historial[0] ? `Reabrir «${historial[0].nombre}»` : 'Aún no hay evaluaciones' },
    { id: 'pdf', etiqueta: 'Informe PDF', tono: 'rojo', Icono: IcoPdf, hacer: () => descargarTodas('pdf'),
      pista: 'Todas las evaluaciones en un informe PDF' },
    { id: 'excel', etiqueta: 'Libro Excel', tono: 'verde', Icono: IcoExcel, hacer: () => descargarTodas('excel'),
      pista: 'Todas las evaluaciones en un libro Excel' },
  ]

  const empezar = (e) => { e.preventDefault(); onStart() }
  const titulo = nombreEvaluacion(software)

  return (
    <div className="sw">
      <section className="hero">
        <span className="hero-paso">Paso 1 de 4</span>
        <h2 className="hero-titulo">¿Qué software evaluamos hoy?</h2>
        <form className="hero-buscar" onSubmit={e => e.preventDefault()} role="search">
          <IcoBuscar />
          <input
            className="hero-input"
            placeholder="Buscar evaluaciones por software, organización o evaluador…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            aria-label="Buscar evaluaciones"
          />
        </form>
        <div className="hero-accesos">
          {ACCESOS.map(({ id, etiqueta, tono, Icono, hacer, inactivo, pista }) => (
            <button
              key={id}
              type="button"
              className={`acceso acceso-${tono}`}
              onClick={hacer}
              disabled={inactivo || Boolean(exportando)}
              title={pista || etiqueta}
            >
              <span className="acceso-circulo"><Icono /></span>
              <span className="acceso-etiqueta">{exportando === id ? 'Preparando…' : etiqueta}</span>
            </button>
          ))}
        </div>
      </section>

      <form className="card sw-form" onSubmit={empezar}>
        <div className="sw-form-cab">
          <h3 className="sw-form-titulo">El producto y quién evalúa</h3>
          <span className="sw-form-nota">
            Todo opcional · Se guardará como <b className={titulo === 'Evaluación sin nombre' ? 'sw-preview-vacio' : ''}>{titulo}</b>
          </span>
        </div>

        <div className="sw-rejilla">
          <Campo etiqueta="Nombre del software">
            <input
              ref={nombreRef}
              className="field-input"
              placeholder="Moodle, Odoo, LibreOffice…"
              value={software.nombre}
              maxLength={200}
              onChange={set('nombre')}
            />
          </Campo>
          <Campo etiqueta="Versión">
            <input className="field-input" placeholder="4.3" maxLength={50} value={software.version} onChange={set('version')} />
          </Campo>
          <Campo etiqueta="Tipo de licencia">
            <select className="field-input" value={software.licencia} onChange={set('licencia')}>
              <option value="">Seleccione…</option>
              {LICENCIAS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Proveedor o comunidad">
            <input className="field-input" placeholder="Moodle HQ" maxLength={200} value={software.proveedor} onChange={set('proveedor')} />
          </Campo>
          <Campo etiqueta="Organización">
            <input className="field-input" placeholder="Universidad Estatal de Milagro" maxLength={200} value={software.organizacion} onChange={set('organizacion')} />
          </Campo>
          <Campo etiqueta="Evaluador">
            <input className="field-input" placeholder="Nombre del decisor" maxLength={200} value={software.evaluador} onChange={set('evaluador')} />
          </Campo>
        </div>

        <div className="sw-acciones">
          <span className="sw-acciones-nota">Nada de esto interviene en el cálculo. Lo siguiente: ajustar la importancia de los 18 factores.</span>
          <button type="submit" className="btn btn-primary">Comenzar evaluación</button>
        </div>
      </form>

      {(mostradas.length > 0 || q) && (
        <section className="recientes">
          <h3 className="recientes-titulo">
            {q ? `Resultados para «${busqueda.trim()}»` : 'También podrías continuar con…'}
          </h3>
          <div className="recientes-fila">
            {mostradas.map(ev => {
              const cod = ev.recomendacion_codigo
              return (
                <button
                  key={ev.id}
                  type="button"
                  className={`reciente ${REC_V[cod] || 'v-ninguno'}`}
                  onClick={() => onReabrir?.(ev.id)}
                  title="Reabrir esta evaluación para cambiar sus respuestas"
                >
                  <span className="reciente-miniatura">
                    <b>{cod || '–'}</b>
                    <small>{cod ? REC_CORTO[cod] : 'Sin veredicto'}</small>
                  </span>
                  <span className="reciente-nombre">{ev.nombre}</span>
                  <span className="reciente-fecha">{fechaCorta(ev.creado_en)}</span>
                </button>
              )
            })}
            {q && (
              <button type="button" className="reciente reciente-nuevo" onClick={evaluarBuscado}
                      title="Usar lo buscado como nombre del software a evaluar">
                <span className="reciente-miniatura"><IcoMas /></span>
                <span className="reciente-nombre">Evaluar «{busqueda.trim()}»</span>
                <span className="reciente-fecha">como software nuevo</span>
              </button>
            )}
          </div>
          {ocultas > 0 && (
            <p className="recientes-nota">
              {q
                ? `Hay ${ocultas} coincidencias más; afine la búsqueda o consulte el historial.`
                : `Las ${ocultas} restantes están en el historial.`}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
