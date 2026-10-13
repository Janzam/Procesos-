// Listado de evaluaciones compartido por el panel y el historial: pestañas con
// contador por veredicto, buscador, cambio de vista (rejilla de tarjetas o
// filas) y las acciones de cada evaluación, incluida la exportación directa.
import { useState, useEffect } from 'react'
import { getEvaluacion, eliminarEvaluacion } from '../api/guiosad.js'
import { REC_V, REC_CORTO } from '../utils/recomendacion.js'
import { exportarResultado, precargarExportacion } from '../utils/exportacion.js'
import { fechaCorta } from '../utils/fecha.js'
import TarjetaEvaluacion, { AccionesTarjeta, tituloDe } from './TarjetaEvaluacion.jsx'
import { IcoBuscar, IcoRejilla, IcoLista } from './Iconos.jsx'

const PESTANAS = [
  { id: 'todas', label: 'Todas' },
  { id: 'A', label: REC_CORTO.A },
  { id: 'B', label: REC_CORTO.B },
  { id: 'C', label: REC_CORTO.C },
]

// La vista elegida se recuerda entre sesiones, como el resto de preferencias.
const VISTA_KEY = 'guiosad-vista'
function leerVista() {
  try { return localStorage.getItem(VISTA_KEY) === 'lista' ? 'lista' : 'rejilla' } catch { return 'rejilla' }
}

function FilaEvaluacion(props) {
  const { ev, onVer } = props
  const cod = ev.recomendacion_codigo
  const pond = ev.ponderacion_media
  return (
    <div className={`fila ${REC_V[cod] || 'v-ninguno'}`}>
      <button type="button" className="fila-cuerpo" onClick={() => onVer(ev)}>
        <span className="tarjeta-icono tarjeta-icono-sm" aria-hidden="true">{cod || '–'}</span>
        <span className="fila-texto">
          <span className="fila-titulo">{tituloDe(ev)}</span>
          <span className="fila-sub">{ev.organizacion || 'Sin organización'} · {fechaCorta(ev.creado_en)}</span>
        </span>
        <span className="fila-veredicto">{cod ? REC_CORTO[cod] : 'Sin veredicto'}</span>
        <span className="fila-pond">{pond != null ? pond.toFixed(2) : '—'}<small> / 4</small></span>
      </button>
      <AccionesTarjeta {...props} />
    </div>
  )
}

export default function ListaEvaluaciones({ evaluaciones, onVer, onEditar, onBorrada, onError }) {
  const [filtro, setFiltro] = useState('todas')
  const [texto, setTexto] = useState('')
  const [vista, setVista] = useState(leerVista)
  const [ocupado, setOcupado] = useState(null)    // "id:tipo" de la exportación en curso
  const [borrando, setBorrando] = useState(null)

  useEffect(() => { precargarExportacion() }, [])
  useEffect(() => {
    try { localStorage.setItem(VISTA_KEY, vista) } catch { /* modo privado */ }
  }, [vista])

  const cuenta = { todas: evaluaciones.length, A: 0, B: 0, C: 0 }
  evaluaciones.forEach(e => { if (cuenta[e.recomendacion_codigo] !== undefined) cuenta[e.recomendacion_codigo]++ })

  const q = texto.trim().toLowerCase()
  const visibles = evaluaciones.filter(e =>
    (filtro === 'todas' || e.recomendacion_codigo === filtro) &&
    (!q || [e.nombre, e.organizacion, e.software_nombre, e.evaluador]
      .some(v => (v || '').toLowerCase().includes(q))),
  )

  // Las tarjetas no tienen el resultado completo: se pide al servidor y se
  // exporta con el mismo módulo que usa la pantalla de resultados.
  async function exportar(tipo, ev) {
    setOcupado(`${ev.id}:${tipo}`)
    try {
      const detalle = await getEvaluacion(ev.id)
      await exportarResultado(tipo, detalle.nombre, detalle.resultado)
    } catch (e) {
      onError?.(e.message)
    } finally {
      setOcupado(null)
    }
  }

  async function borrar(ev) {
    const seguro = window.confirm(
      `¿Eliminar «${ev.nombre}»?\n\n` +
      'Se borrarán sus respuestas y su resultado. Esta acción no se puede deshacer.',
    )
    if (!seguro) return
    setBorrando(ev.id)
    try {
      await eliminarEvaluacion(ev.id)
      onBorrada?.(ev.id)
    } catch (e) {
      onError?.(e.message)
    } finally {
      setBorrando(null)
    }
  }

  const accionesDe = ev => ({
    ev, onVer, onEditar, onBorrar: borrar, onExportar: exportar, ocupado, borrando,
  })

  return (
    <div className="lista">
      <div className="lista-barra">
        <div className="pestanas" role="tablist" aria-label="Filtrar por veredicto">
          {PESTANAS.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={filtro === p.id}
              className={`pestana${filtro === p.id ? ' pestana-activa' : ''}`}
              onClick={() => setFiltro(p.id)}
            >
              {p.label}
              <span className="pestana-cuenta">{cuenta[p.id]}</span>
            </button>
          ))}
        </div>
        <div className="lista-herramientas">
          <label className="buscar">
            <IcoBuscar />
            <input
              placeholder="Buscar por software, organización o evaluador…"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              aria-label="Buscar evaluaciones"
            />
          </label>
          <div className="vista-toggle" role="group" aria-label="Vista">
            <button className={vista === 'rejilla' ? 'activo' : ''} onClick={() => setVista('rejilla')} title="Tarjetas" aria-label="Ver como tarjetas"><IcoRejilla /></button>
            <button className={vista === 'lista' ? 'activo' : ''} onClick={() => setVista('lista')} title="Lista" aria-label="Ver como lista"><IcoLista /></button>
          </div>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="an-vacio lista-vacia">
          {q ? `Ninguna evaluación coincide con «${texto}».` : 'No hay evaluaciones con ese veredicto.'}
        </p>
      ) : vista === 'rejilla' ? (
        <div className="tarjetas">
          {visibles.map(ev => <TarjetaEvaluacion key={ev.id} {...accionesDe(ev)} />)}
        </div>
      ) : (
        <div className="filas">
          {visibles.map(ev => <FilaEvaluacion key={ev.id} {...accionesDe(ev)} />)}
        </div>
      )}
    </div>
  )
}
