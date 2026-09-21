// origen: main.py (Tab 1) | cambio: tarjetas por dimensión, layout 2 líneas por factor
import { calcularIRLocal } from '../../api/guiosad.js'

const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']
const IR_CLASS = ['badge-ir-irrelevante', 'badge-ir-opcional', 'badge-ir-importante', 'badge-ir-fundamental']

const DIM_STYLE = {
  'Tecnológica':    'dim-teal',
  'Organizacional': 'dim-purple',
  'Económica':      'dim-amber',
}

function sliderPct(val) { return Math.round(((val - 1) / 3) * 100) + '%' }

export default function StepFactores({ factores, evaluacion, onChange }) {
  const dims = [...new Set(factores.map(f => f.dimension))]

  function handleSlider(factorId, value) {
    onChange({ ...evaluacion, [factorId]: { ...evaluacion[factorId], importancia_decisor: value } })
  }
  function handleAlcance(factorId, value) {
    onChange({ ...evaluacion, [factorId]: { ...evaluacion[factorId], alcance_elegido: value } })
  }

  return (
    <div className="dim-grid">
      {dims.map((dim, di) => {
        const dimFactores = factores.filter(f => f.dimension === dim)
        return (
          <div className="card" key={dim} style={{ animationDelay: `${di * 0.07}s` }}>
            <div className={`card-header ${DIM_STYLE[dim] || 'dim-teal'}`}>
              <div className="card-header-badge">{di + 1}</div>
              <span className="card-header-title">Dimensión {dim}</span>
            </div>
            <div className="card-body">
              {dimFactores.map(f => {
                const ev = evaluacion[f.id] || {
                  importancia_decisor: 1,
                  alcance_elegido: f.alcance !== 'Ambos' ? f.alcance : 'Interno'
                }
                const ir = calcularIRLocal(f.importancia_sugerida, ev.importancia_decisor)
                const idIdx = ev.importancia_decisor - 1
                return (
                  <div className="factor-row" key={f.id}>
                    {/* Línea 1: nombre + IR badge */}
                    <div className="factor-row-top">
                      <span className="factor-name">{f.nombre}</span>
                      <span className={`badge ${ir.relevante ? 'badge-ir-importante' : 'badge-ir-irrelevante'}`}>
                        IR {ir.valor !== undefined ? ir.valor : ''}
                      </span>
                    </div>
                    {/* Línea 2: IS badge + slider + ID badge + alcance */}
                    <div className="factor-row-bottom">
                      <span className="badge badge-gray" style={{ fontSize: 9.5 }}>
                        IS: {NIVELES[f.importancia_sugerida - 1]}
                      </span>
                      <div className="slider-wrap">
                        <span className="slider-label">ID</span>
                        <input
                          type="range" min={1} max={4} step={1}
                          value={ev.importancia_decisor}
                          style={{ '--pct': sliderPct(ev.importancia_decisor) }}
                          onChange={e => handleSlider(f.id, Number(e.target.value))}
                        />
                      </div>
                      <span className={`badge ${IR_CLASS[idIdx]}`} style={{ fontSize: 10 }}>
                        {NIVELES[idIdx]}
                      </span>
                      {f.alcance === 'Ambos' && (
                        <select
                          className="alcance-select"
                          value={ev.alcance_elegido || 'Interno'}
                          onChange={e => handleAlcance(f.id, e.target.value)}
                        >
                          <option value="Interno">Interno</option>
                          <option value="Externo">Externo</option>
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
