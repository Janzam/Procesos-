// origen: main.py (flujo de 6 pasos completo) | cambio: wizard de 3 etapas en React
import { useState, useEffect } from 'react'
import { getFactores, crearEvaluacion, calcularIRLocal } from '../api/guiosad.js'
import StepFactores from '../components/wizard/StepFactores.jsx'
import StepSubfactores from '../components/wizard/StepSubfactores.jsx'
import StepResultados from '../components/wizard/StepResultados.jsx'

const PASOS = ['Paso 1-2: Factores', 'Paso 3-4: Subfactores', 'Paso 5-6: Resultado']

export default function EvaluacionPage() {
  const [step, setStep] = useState(0)
  const [factores, setFactores] = useState([])
  const [nombre, setNombre] = useState('')
  const [evFactores, setEvFactores] = useState({})
  const [evSubfactores, setEvSubfactores] = useState({})
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getFactores().then(setFactores).catch(() => setError('No se pudo cargar la lista de factores.'))
  }, [])

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']
      const factoresPayload = factores.map((f) => {
        const ev = evFactores[f.id] || { importancia_decisor: 1, alcance_elegido: f.alcance !== 'Ambos' ? f.alcance : 'Interno' }
        const ir = calcularIRLocal(f.importancia_sugerida, ev.importancia_decisor)
        const subfactoresPayload = ir.relevante
          ? f.subfactores.map((s) => ({ subfactor_id: s.id, valor: evSubfactores[s.id] || 1 }))
          : []
        return {
          factor_id: f.id,
          importancia_decisor: ev.importancia_decisor,
          alcance_elegido: f.alcance === 'Ambos' ? ev.alcance_elegido : null,
          subfactores: subfactoresPayload,
        }
      })
      const res = await crearEvaluacion({ nombre: nombre || 'Evaluación sin nombre', factores: factoresPayload })
      setResultado(res.resultado)
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 8 }}>Nueva Evaluación GUIOSAD</h2>
      <input
        placeholder="Nombre de la evaluación (ej: Evaluación LibreOffice 2025)"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', marginBottom: 20, fontSize: 14 }}
      />

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {PASOS.map((p, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 600,
            background: i === step ? '#1a1a2e' : i < step ? '#4f8ef7' : '#ddd',
            color: i <= step ? '#fff' : '#666',
            borderRadius: i === 0 ? '8px 0 0 8px' : i === PASOS.length - 1 ? '0 8px 8px 0' : 0,
            cursor: i < step ? 'pointer' : 'default',
          }} onClick={() => i < step && setStep(i)}>
            {p}
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px #0001' }}>
        {error && <p style={{ color: '#e74c3c', marginBottom: 12 }}>{error}</p>}
        {step === 0 && <StepFactores factores={factores} evaluacion={evFactores} onChange={setEvFactores} />}
        {step === 1 && <StepSubfactores factores={factores} evaluacionFactores={evFactores} subfactores={evSubfactores} onChange={setEvSubfactores} />}
        {step === 2 && <StepResultados resultado={resultado} />}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        {step > 0 && step < 2 && (
          <button onClick={() => setStep(step - 1)} style={btnSecondary}>← Anterior</button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {step === 0 && <button onClick={() => setStep(1)} style={btnPrimary}>Siguiente →</button>}
          {step === 1 && (
            <button onClick={handleSubmit} disabled={loading} style={btnPrimary}>
              {loading ? 'Calculando...' : 'Calcular resultado →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const btnPrimary = { background: '#1a1a2e', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }
const btnSecondary = { background: '#eee', color: '#333', border: 'none', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }
