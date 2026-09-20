// origen: nuevo | cambio: no existía en el sistema original (router de páginas)
import { useState } from 'react'
import EvaluacionPage from './pages/EvaluacionPage.jsx'
import HistorialPage from './pages/HistorialPage.jsx'

const NAV = { evaluacion: 'Nueva evaluación', historial: 'Historial' }

export default function App() {
  const [page, setPage] = useState('evaluacion')

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#1a1a2e', color: '#fff', padding: '12px 24px', display: 'flex', gap: 24, alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 18, marginRight: 'auto' }}>GUIOSAD v2</span>
        {Object.entries(NAV).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            style={{
              background: page === key ? '#4f8ef7' : 'transparent',
              color: '#fff', border: 'none', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 6, fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <main style={{ padding: 24 }}>
        {page === 'evaluacion' && <EvaluacionPage />}
        {page === 'historial' && <HistorialPage />}
      </main>
    </div>
  )
}
