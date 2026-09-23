// origen: nuevo | cambio: historial con lista de tarjetas + panel de detalle, tema oscuro
import { useState, useEffect } from 'react'
import { getHistorial, getEvaluacion } from '../api/guiosad.js'
import StepResultados from '../components/wizard/StepResultados.jsx'

const REC_COLOR = { A: 'var(--green)', B: 'var(--amber)', C: 'var(--red)' }

// Preferencia de mostrar/ocultar la lista lateral (se recuerda entre sesiones)
const LISTA_KEY = 'guiosad-historial-lista'
function leerMostrarLista() {
  try { return localStorage.getItem(LISTA_KEY) !== 'no' } catch { return true }
}

export default function HistorialPage() {
  const [historial, setHistorial] = useState([])
  const [selId, setSelId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mostrarLista, setMostrarLista] = useState(leerMostrarLista)

  useEffect(() => { getHistorial().then(setHistorial) }, [])
  useEffect(() => {
    try { localStorage.setItem(LISTA_KEY, mostrarLista ? 'si' : 'no') } catch { /* ignorar */ }
  }, [mostrarLista])

  async function verDetalle(id) {
    setLoading(true)
    setSelId(id)
    const data = await getEvaluacion(id)
    setDetalle(data)
    setLoading(false)
  }

  const recCod = detalle?.resultado?.recomendacion?.codigo

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Historial</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Evaluaciones anteriores guardadas en la base de datos.</p>
        </div>
        <button
          className="btn btn-outline btn-xs"
          onClick={() => setMostrarLista(v => !v)}
          title={mostrarLista ? 'Ocultar la lista para ver el detalle a pantalla completa' : 'Mostrar la lista de evaluaciones'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {mostrarLista
              ? <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
              : <path d="M13 5l7 7-7 7M6 5l7 7-7 7"/>}
          </svg>
          {mostrarLista ? 'Ocultar lista' : `Mostrar lista (${historial.length})`}
        </button>
      </div>

      <div className={`historial-grid${mostrarLista ? '' : ' historial-grid-solo-detalle'}`}>
        {/* Lista */}
        {mostrarLista && (
        <div className="card" style={{ padding: 12 }}>
          {historial.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p>No hay evaluaciones todavía.</p>
            </div>
          ) : (
            <div className="historial-list">
              {historial.map(ev => {
                const cod = ev.recomendacion_codigo
                return (
                  <div
                    key={ev.id}
                    className={`historial-item${selId === ev.id ? ' active' : ''}`}
                    onClick={() => verDetalle(ev.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div className="historial-item-name">{ev.nombre}</div>
                      {cod && (
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', background: REC_COLOR[cod] || '#475569',
                          color: '#fff', fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{cod}</span>
                      )}
                    </div>
                    <div className="historial-item-date">
                      {new Date(ev.creado_en).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}

        {/* Detalle */}
        <div>
          {loading && (
            <div className="empty-state">
              <p style={{ color: 'var(--brand)' }}>Cargando…</p>
            </div>
          )}
          {!loading && detalle && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{detalle.nombre}</h2>
                {recCod && (
                  <span style={{
                    background: REC_COLOR[recCod] || '#475569', color: '#fff',
                    padding: '2px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700,
                  }}>Rec. {recCod}</span>
                )}
              </div>
              <StepResultados resultado={detalle.resultado} nombre={detalle.nombre} />
            </div>
          )}
          {!loading && !detalle && (
            <div className="empty-state card" style={{ minHeight: 300 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
              </svg>
              <p>Selecciona una evaluación para ver el detalle.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
