// Historial de evaluaciones: el mismo listado de tarjetas del panel y, al elegir
// una, su detalle con el resultado completo. `verId` permite llegar desde el
// panel directamente a una evaluación.
import { useState, useEffect } from 'react'
import { getHistorial, getEvaluacion, eliminarEvaluacion } from '../api/guiosad.js'
import { REC_V, REC_CORTO } from '../utils/recomendacion.js'
import { fechaLarga } from '../utils/fecha.js'
import ListaEvaluaciones from '../components/ListaEvaluaciones.jsx'
import StepResultados from '../components/wizard/StepResultados.jsx'
import { IcoVolver, IcoEditar, IcoBorrar, IcoVacio, IcoMas } from '../components/Iconos.jsx'

// Datos del software evaluado. Solo se muestran los que se rellenaron; las
// evaluaciones guardadas antes de esta versión no los tienen.
const CAMPOS_SOFTWARE = [
  ['software_nombre', 'Software'], ['version', 'Versión'], ['licencia', 'Licencia'],
  ['proveedor', 'Proveedor'], ['organizacion', 'Organización'], ['evaluador', 'Evaluador'],
]

function Veredicto({ codigo }) {
  if (!codigo) return null
  return (
    <span className={`vchip vchip-lg ${REC_V[codigo] || ''}`}>
      <b>{codigo}</b>
      <span>{REC_CORTO[codigo]}</span>
    </span>
  )
}

function FichaSoftware({ software }) {
  if (!software) return null
  const datos = CAMPOS_SOFTWARE.filter(([k]) => software[k])
  if (!datos.length) return null
  return (
    <div className="ficha-sw">
      {datos.map(([k, etiqueta]) => (
        <div className="ficha-sw-dato" key={k}>
          <span className="ficha-sw-etiqueta">{etiqueta}</span>
          <span className="ficha-sw-valor">{software[k]}</span>
        </div>
      ))}
    </div>
  )
}

export default function HistorialPage({ onNavigate, verId }) {
  const [historial, setHistorial] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { getHistorial().then(setHistorial).catch(() => setHistorial([])) }, [])

  async function verDetalle(id) {
    setLoading(true)
    setError(null)
    try {
      setDetalle(await getEvaluacion(id))
    } catch {
      setError('No se pudo cargar la evaluación.')
    } finally {
      setLoading(false)
    }
  }

  // Al llegar desde el panel con una evaluación elegida se abre directamente.
  useEffect(() => { if (verId) verDetalle(verId) }, [verId])

  function volver() {
    setDetalle(null)
  }

  async function borrarDetalle() {
    const seguro = window.confirm(
      `¿Eliminar «${detalle.nombre}»?\n\n` +
      'Se borrarán sus respuestas y su resultado. Esta acción no se puede deshacer.',
    )
    if (!seguro) return
    setBorrando(true)
    setError(null)
    try {
      await eliminarEvaluacion(detalle.id)
      setHistorial(prev => prev.filter(e => e.id !== detalle.id))
      volver()
    } catch (e) {
      setError(e.message)
    } finally {
      setBorrando(false)
    }
  }

  const cuenta = { A: 0, B: 0, C: 0 }
  historial.forEach(e => { if (cuenta[e.recomendacion_codigo] !== undefined) cuenta[e.recomendacion_codigo]++ })

  return (
    <div>
      <header className="pagina-cab">
        <div>
          <h1 className="page-title">Historial</h1>
          <p className="page-subtitle">
            {historial.length
              ? <>{historial.length} evaluaciones guardadas · {cuenta.A} adoptar, {cuenta.B} con reservas, {cuenta.C} no adoptar</>
              : 'Evaluaciones anteriores guardadas en la base de datos.'}
          </p>
        </div>
        {detalle ? (
          <div className="hist-acciones">
            <button className="btn btn-outline btn-xs" onClick={volver}><IcoVolver /> Volver</button>
            <button
              className="btn btn-outline btn-xs"
              onClick={() => onNavigate?.('evaluacion', { editar: detalle.id })}
              title="Reabrir esta evaluación para cambiar sus respuestas"
            >
              <IcoEditar /> Editar respuestas
            </button>
            <button className="btn btn-peligro btn-xs" disabled={borrando} onClick={borrarDetalle}>
              <IcoBorrar /> {borrando ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => onNavigate?.('evaluacion')}><IcoMas /> Nueva evaluación</button>
        )}
      </header>

      {error && <div className="error-msg">{error}</div>}

      {historial.length === 0 && !detalle && !loading && (
        <div className="empty-state card">
          <IcoVacio />
          <p>No hay evaluaciones todavía.</p>
        </div>
      )}

      {historial.length > 0 && !detalle && !loading && (
        <ListaEvaluaciones
          evaluaciones={historial}
          onVer={ev => verDetalle(ev.id)}
          onEditar={ev => onNavigate?.('evaluacion', { editar: ev.id })}
          onBorrada={id => setHistorial(prev => prev.filter(e => e.id !== id))}
          onError={setError}
        />
      )}

      {loading && <p className="an-vacio lista-vacia">Cargando evaluación…</p>}

      {detalle && !loading && (
        <div className="hist-detalle">
          <div className="hist-detalle-cab">
            <div>
              <h2 className="hist-detalle-titulo">{detalle.nombre}</h2>
              <p className="hist-detalle-fecha">Evaluada el {fechaLarga(detalle.creado_en)}</p>
            </div>
            <Veredicto codigo={detalle.resultado?.recomendacion?.codigo} />
          </div>

          <FichaSoftware software={detalle.software} />

          <StepResultados
            resultado={detalle.resultado}
            nombre={detalle.nombre}
            evaluacionId={detalle.id}
          />

          {historial.length > 1 && (
            <nav className="hist-saltos">
              <span className="hist-saltos-titulo">Otras evaluaciones</span>
              <div className="hist-saltos-lista">
                {historial.filter(e => e.id !== detalle.id).slice(0, 8).map(ev => (
                  <button key={ev.id} className="hist-salto" onClick={() => verDetalle(ev.id)}>
                    <span className={`leyenda-punto ${REC_V[ev.recomendacion_codigo] || ''}`} aria-hidden="true" />
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
