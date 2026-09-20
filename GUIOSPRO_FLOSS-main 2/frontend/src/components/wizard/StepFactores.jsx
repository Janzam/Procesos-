// origen: main.py (Tab 1, sliders de factores, update_results) | cambio: ninguno en lógica, UI migrada a React
import { calcularIRLocal } from '../../api/guiosad.js'

const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']
const COLORES_IR = { Irrelevante: '#ccc', Opcional: '#f0c040', Importante: '#4f8ef7', Fundamental: '#2ecc71' }

export default function StepFactores({ factores, evaluacion, onChange }) {
  function handleSlider(factorId, value) {
    onChange({ ...evaluacion, [factorId]: { ...evaluacion[factorId], importancia_decisor: value } })
  }

  function handleAlcance(factorId, value) {
    onChange({ ...evaluacion, [factorId]: { ...evaluacion[factorId], alcance_elegido: value } })
  }

  return (
    <div>
      <p style={{ marginBottom: 16, color: '#555' }}>
        Evalúe la importancia de cada factor para su organización. El sistema calculará la
        importancia relativa combinando su evaluación con la importancia sugerida.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#1a1a2e', color: '#fff' }}>
              <th style={th}>Factor</th>
              <th style={th}>Imp. Sugerida</th>
              <th style={th}>Su evaluación</th>
              <th style={th}>Imp. Decisor</th>
              <th style={th}>Imp. Relativa</th>
              <th style={th}>Alcance</th>
            </tr>
          </thead>
          <tbody>
            {factores.map((f) => {
              const ev = evaluacion[f.id] || { importancia_decisor: 1, alcance_elegido: f.alcance !== 'Ambos' ? f.alcance : 'Interno' }
              const ir = calcularIRLocal(f.importancia_sugerida, ev.importancia_decisor)
              return (
                <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{f.nombre}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={badge(COLORES_IR[NIVELES[f.importancia_sugerida - 1]])}>
                      {NIVELES[f.importancia_sugerida - 1]}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input
                      type="range" min={1} max={4} step={1}
                      value={ev.importancia_decisor}
                      onChange={(e) => handleSlider(f.id, Number(e.target.value))}
                      style={{ width: 100 }}
                    />
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={badge(COLORES_IR[NIVELES[ev.importancia_decisor - 1]])}>
                      {NIVELES[ev.importancia_decisor - 1]}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={badge(ir.relevante ? '#2ecc71' : '#aaa')}>{ir.etiqueta}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {f.alcance === 'Ambos' ? (
                      <select
                        value={ev.alcance_elegido || 'Interno'}
                        onChange={(e) => handleAlcance(f.id, e.target.value)}
                        style={{ padding: '2px 6px', borderRadius: 4 }}
                      >
                        <option>Interno</option>
                        <option>Externo</option>
                      </select>
                    ) : (
                      <span style={{ color: '#555' }}>{f.alcance}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600 }
const td = { padding: '8px 12px' }
const badge = (color) => ({
  display: 'inline-block', background: color,
  padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#fff',
})
