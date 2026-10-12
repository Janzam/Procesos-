// Historial de evaluaciones.
//
// Mientras no hay nada seleccionado el panel no se queda en blanco: muestra las
// evaluaciones como tarjetas con su veredicto, de modo que la pantalla sirve
// para algo nada más abrirla.
import { useState, useEffect } from 'react'
import { getHistorial, getEvaluacion, eliminarEvaluacion } from '../api/guiosad.js'
import StepResultados from '../components/wizard/StepResultados.jsx'

const REC = {
  A: { clase: 'v-a', corto: 'Adoptar' },
  B: { clase: 'v-b', corto: 'Con reservas' },
  C: { clase: 'v-c', corto: 'No adoptar' },
}

// Datos del software evaluado. Solo se muestran los que se rellenaron; las
// evaluaciones guardadas antes de esta versión no los tienen.
const CAMPOS_SOFTWARE = [
  ['software_nombre', 'Software'], ['version', 'Versión'], ['licencia', 'Licencia'],
  ['proveedor', 'Proveedor'], ['organizacion', 'Organización'], ['evaluador', 'Evaluador'],
]

function fecha(iso, largo = false) {
  return new Date(iso).toLocaleString('es', largo
    ? { dateStyle: 'long', timeStyle: 'short' }
    : { day: '2-digit', month: 'short', year: '2-digit' })
}

function Veredicto({ codigo, grande }) {
  if (!codigo) return null
  return (
    <span className={`vchip ${REC[codigo]?.clase || ''}${grande ? ' vchip-lg' : ''}`}>
      <b>{codigo}</b>
      <span>{REC[codigo]?.corto}</span>
    </span>
  )
}

function FichaSoftware({ software }) {
  if (!software) return null
  const datos = CAMPOS_SOFTWARE.filter(([k]) => software[k])
  if (!datos.length) return null
  return (
    <div className="ficha">
      {datos.map(([k, etiqueta]) => (
        <div className="ficha-dato" key={k}>
          <span className="ficha-etiqueta">{etiqueta}</span>
          <span className="ficha-valor">{software[k]}</span>
        </div>
      ))}
    </div>
  )
}

export default function HistorialPage({ onNavigate }) {
  const [historial, setHistorial] = useState([])
  const [selId, setSelId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [borrando, setBorrando] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { getHistorial().then(setHistorial).catch(() => setHistorial([])) }, [])

  async function verDetalle(id) {
    setLoading(true)
    setSelId(id)
    try {
      setDetalle(await getEvaluacion(id))
    } finally {
      setLoading(false)
    }
  }

  function volver() {
    setSelId(null)
    setDetalle(null)
  }

  // Borrar es irreversible y se pide confirmación nombrando lo que se pierde.
  // El catálogo de la metodología no se toca: desaparecen las respuestas de esta
  // evaluación, no las dimensiones, factores ni subfactores.
  async function borrar(ev) {
    const seguro = window.confirm(
      `¿Eliminar «${ev.nombre}»?\n\n` +
      'Se borrarán sus respuestas y su resultado. Esta acción no se puede deshacer.'
    )
    if (!seguro) return
    setBorrando(ev.id)
    setError(null)
    try {
      await eliminarEvaluacion(ev.id)
      setHistorial(prev => prev.filter(e => e.id !== ev.id))
      if (selId === ev.id) volver()
    } catch (e) {
      setError(e.message)
    } finally {
      setBorrando(null)
    }
  }

  const texto = filtro.trim().toLowerCase()
  const visibles = texto
    ? historial.filter(e => e.nombre.toLowerCase().includes(texto)
        || (e.organizacion || '').toLowerCase().includes(texto))
    : historial

  const cuenta = { A: 0, B: 0, C: 0 }
  historial.forEach(e => { if (cuenta[e.recomendacion_codigo] !== undefined) cuenta[e.recomendacion_codigo]++ })

  return (
    <div>
      <header className="dash-cab">
        <div>
          <h1 className="page-title">Historial</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {historial.length
              ? <>{historial.length} evaluaciones guardadas · {cuenta.A} adoptar, {cuenta.B} con reservas, {cuenta.C} posponer</>
              : 'Evaluaciones anteriores guardadas en la base de datos.'}
          </p>
        </div>
        {detalle && (
          <div className="hist-acciones">
            <button className="btn btn-outline btn-xs" onClick={volver}>← Volver</button>
            <button
              className="btn btn-outline btn-xs"
              onClick={() => onNavigate?.('evaluacion', { editar: detalle.id })}
              title="Reabrir esta evaluación para cambiar sus respuestas"
            >
              Editar respuestas
            </button>
            <button
              className="btn btn-peligro btn-xs"
              disabled={borrando === detalle.id}
              onClick={() => borrar({ id: detalle.id, nombre: detalle.nombre })}
            >
              {borrando === detalle.id ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        )}
      </header>

      {error && <div className="error-msg">{error}</div>}

      {historial.length === 0 && (
        <div className="empty-state card" style={{ minHeight: 240 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p>No hay evaluaciones todavía.</p>
        </div>
      )}

      {/* Sin selección: las evaluaciones como tarjetas, no una pantalla vacía */}
      {historial.length > 0 && !detalle && !loading && (
        <>
          <div className="hist-barra">
            <input
              className="field-input hist-buscar"
              placeholder="Buscar por nombre u organización…"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
            <span className="hist-cuenta">{visibles.length} de {historial.length}</span>
          </div>

          {visibles.length === 0
            ? <p className="an-vacio" style={{ padding: '28px 2px' }}>Ninguna evaluación coincide con «{filtro}».</p>
            : (
              <div className="hist-rejilla">
                {visibles.map(ev => (
                  <div key={ev.id} className={`hist-tarjeta ${REC[ev.recomendacion_codigo]?.clase || ''}`}>
                    <button className="hist-tarjeta-cuerpo" onClick={() => verDetalle(ev.id)}>
                      <span className="hist-tarjeta-cab">
                        <Veredicto codigo={ev.recomendacion_codigo} />
                        <span className="hist-fecha">{fecha(ev.creado_en)}</span>
                      </span>
                      <span className="hist-nombre">{ev.nombre}</span>
                      {ev.organizacion && <span className="hist-org">{ev.organizacion}</span>}
                    </button>
                    <div className="hist-tarjeta-pie">
                      <button className="hist-accion" onClick={() => onNavigate?.('evaluacion', { editar: ev.id })}>
                        Editar
                      </button>
                      <button
                        className="hist-accion hist-accion-peligro"
                        disabled={borrando === ev.id}
                        onClick={() => borrar(ev)}
                      >
                        {borrando === ev.id ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      )}

      {loading && <p className="an-vacio" style={{ padding: '28px 2px' }}>Cargando evaluación…</p>}

      {/* Detalle */}
      {detalle && !loading && (
        <div className="hist-detalle">
          <div className="hist-detalle-cab">
            <div>
              <h2 className="hist-detalle-titulo">{detalle.nombre}</h2>
              <p className="hist-detalle-fecha">Evaluada el {fecha(detalle.creado_en, true)}</p>
            </div>
            <Veredicto codigo={detalle.resultado?.recomendacion?.codigo} grande />
          </div>

          <FichaSoftware software={detalle.software} />

          <StepResultados
            resultado={detalle.resultado}
            nombre={detalle.nombre}
            evaluacionId={detalle.id}
          />

          {/* Saltar a otra evaluación sin volver al listado */}
          {historial.length > 1 && (
            <nav className="hist-saltos">
              <span className="hist-saltos-titulo">Otras evaluaciones</span>
              <div className="hist-saltos-lista">
                {historial.filter(e => e.id !== selId).slice(0, 8).map(ev => (
                  <button key={ev.id} className="hist-salto" onClick={() => verDetalle(ev.id)}>
                    <span className={`leyenda-punto ${REC[ev.recomendacion_codigo]?.clase || ''}`} aria-hidden="true" />
                    {ev.nombre}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
