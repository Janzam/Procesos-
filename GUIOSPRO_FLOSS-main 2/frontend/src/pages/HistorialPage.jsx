// origen: nuevo | cambio: historial de evaluaciones, no existía en el sistema original
import { useState, useEffect } from 'react'
import { getHistorial, getEvaluacion } from '../api/guiosad.js'
import StepResultados from '../components/wizard/StepResultados.jsx'

export default function HistorialPage() {
  const [historial, setHistorial] = useState([])
  const [seleccionada, setSeleccionada] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getHistorial().then(setHistorial)
  }, [])

  async function verDetalle(id) {
    setLoading(true)
    setSeleccionada(id)
    const data = await getEvaluacion(id)
    setDetalle(data)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>Historial de evaluaciones</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px #0001', height: 'fit-content' }}>
          {historial.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No hay evaluaciones guardadas.</p>}
          {historial.map((ev) => (
            <div
              key={ev.id}
              onClick={() => verDetalle(ev.id)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                background: seleccionada === ev.id ? '#1a1a2e' : '#f5f7fa',
                color: seleccionada === ev.id ? '#fff' : '#333',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.nombre}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{new Date(ev.creado_en).toLocaleString('es')}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px #0001' }}>
          {loading && <p>Cargando...</p>}
          {!loading && detalle && (
            <>
              <h3 style={{ marginBottom: 16 }}>{detalle.nombre}</h3>
              <StepResultados resultado={detalle.resultado} />
            </>
          )}
          {!loading && !detalle && <p style={{ color: '#888' }}>Selecciona una evaluación de la lista.</p>}
        </div>
      </div>
    </div>
  )
}
