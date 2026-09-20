// origen: main.py (Tab 2, btn_sub_pressed, evaluación de subfactores) | cambio: ninguno en lógica, UI migrada a React
import { useState } from 'react'
import { calcularIRLocal } from '../../api/guiosad.js'

const NIVELES_SUB = ['No cumple el requisito', 'Desconozco si cumple', 'Cumple parcialmente', 'Cumple el requisito']

export default function StepSubfactores({ factores, evaluacionFactores, subfactores, onChange }) {
  const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']

  const factoresRelevantes = factores.filter((f) => {
    const ev = evaluacionFactores[f.id]
    if (!ev) return false
    const ir = calcularIRLocal(f.importancia_sugerida, ev.importancia_decisor)
    return ir.relevante
  })

  const [factorSeleccionado, setFactorSeleccionado] = useState(factoresRelevantes[0]?.id || null)

  function handleSubfactor(subfactorId, value) {
    onChange({ ...subfactores, [subfactorId]: value })
  }

  const factor = factores.find((f) => f.id === factorSeleccionado)

  return (
    <div>
      <p style={{ marginBottom: 16, color: '#555' }}>
        Evalúe el cumplimiento de cada subfactor para los factores que resultaron relevantes.
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600 }}>Factor:</label>
        <select
          value={factorSeleccionado || ''}
          onChange={(e) => setFactorSeleccionado(Number(e.target.value))}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', minWidth: 240 }}
        >
          {factoresRelevantes.map((f) => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {factor && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                <th style={th}>Subfactor</th>
                <th style={{ ...th, width: 160 }}>Evaluación</th>
                <th style={{ ...th, width: 220 }}>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {factor.subfactores.map((s) => {
                const val = subfactores[s.id] || 1
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{s.nombre}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="range" min={1} max={4} step={1} value={val}
                        onChange={(e) => handleSubfactor(s.id, Number(e.target.value))}
                        style={{ width: 100 }}
                      />
                    </td>
                    <td style={{ ...td, fontSize: 12, color: '#444' }}>{NIVELES_SUB[val - 1]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {factoresRelevantes.length === 0 && (
        <p style={{ color: '#e74c3c', marginTop: 12 }}>
          No hay factores relevantes. Regrese al Paso 1 y aumente la evaluación de algún factor.
        </p>
      )}
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600 }
const td = { padding: '8px 12px' }
