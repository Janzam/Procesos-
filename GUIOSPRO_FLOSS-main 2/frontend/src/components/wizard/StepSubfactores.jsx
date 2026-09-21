// origen: main.py (Tab 2) | cambio: selector elegante + barra de progreso + sliders custom
import { useState } from 'react'
import { calcularIRLocal } from '../../api/guiosad.js'

const NIVELES_SUB = ['No cumple el requisito', 'Desconozco si cumple', 'Cumple parcialmente', 'Cumple el requisito']
const SUB_COLORS  = ['#7f1d1d','#78350f','#1e3a5f','#064e3b']
const SUB_TEXT    = ['#fca5a5','#fcd34d','#60a5fa','#34d399']

function sliderPct(val) { return Math.round(((val - 1) / 3) * 100) + '%' }

export default function StepSubfactores({ factores, evaluacionFactores, subfactores, onChange }) {
  const relevantes = factores.filter(f => {
    const ev = evaluacionFactores[f.id]
    if (!ev) return false
    return calcularIRLocal(f.importancia_sugerida, ev.importancia_decisor).relevante
  })

  const [selId, setSelId] = useState(relevantes[0]?.id || null)
  const factor = factores.find(f => f.id === selId)

  // progreso: cuántos subfactores de este factor ya tienen valor > 1
  const evaluados = factor
    ? factor.subfactores.filter(s => (subfactores[s.id] || 1) > 1).length
    : 0
  const total = factor?.subfactores.length || 0
  const pct   = total ? Math.round((evaluados / total) * 100) : 0

  function handleSub(id, val) { onChange({ ...subfactores, [id]: val }) }

  if (relevantes.length === 0) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
        </svg>
        <p>No hay factores relevantes. Vuelve al Paso 1 y sube la evaluación de algún factor.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="factor-selector">
        <label>Factor a evaluar:</label>
        <select
          className="factor-select-input"
          value={selId || ''}
          onChange={e => setSelId(Number(e.target.value))}
        >
          {relevantes.map(f => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
        <span className="badge badge-gray">{relevantes.length} factores relevantes</span>
      </div>

      {factor && (
        <div className="card">
          <div className="card-header dim-teal">
            <div className="card-header-badge">{selId}</div>
            <span className="card-header-title">{factor.nombre}</span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <div className="progress-bar-wrap">
              <div className="progress-label">
                <span>Progreso de evaluación</span>
                <span>{evaluados}/{total} subfactores</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: pct + '%' }} />
              </div>
            </div>
            {factor.subfactores.map((s, idx) => {
              const val = subfactores[s.id] || 1
              return (
                <div className="factor-row" key={s.id}>
                  <div className="factor-name">
                    <strong style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 6 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </strong>
                    <strong>{s.nombre}</strong>
                  </div>
                  <div className="factor-controls">
                    <div className="slider-wrap">
                      <input
                        type="range" min={1} max={4} step={1}
                        value={val}
                        style={{ '--pct': sliderPct(val), width: 90 }}
                        onChange={e => handleSub(s.id, Number(e.target.value))}
                      />
                    </div>
                    <span className="badge" style={{
                      background: SUB_COLORS[val - 1], color: SUB_TEXT[val - 1],
                      minWidth: 140, justifyContent: 'center', fontSize: 11
                    }}>
                      {NIVELES_SUB[val - 1]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
