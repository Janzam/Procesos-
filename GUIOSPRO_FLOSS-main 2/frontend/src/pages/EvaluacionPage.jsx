// origen: main.py (flujo 6 pasos) | cambio: wizard con Stepper visual y layout moderno
import { useState, useEffect } from 'react'
import { getFactores, crearEvaluacion, calcularIRLocal } from '../api/guiosad.js'
import Stepper from '../components/Stepper.jsx'
import StepFactores from '../components/wizard/StepFactores.jsx'
import StepSubfactores from '../components/wizard/StepSubfactores.jsx'
import StepResultados from '../components/wizard/StepResultados.jsx'

const STEPS = ['Factores', 'Subfactores', 'Resultados']

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

  async function handleCalcular() {
    setLoading(true)
    setError(null)
    try {
      const factoresPayload = factores.map(f => {
        const ev = evFactores[f.id] || { importancia_decisor: 1, alcance_elegido: f.alcance !== 'Ambos' ? f.alcance : 'Interno' }
        const ir = calcularIRLocal(f.importancia_sugerida, ev.importancia_decisor)
        return {
          factor_id: f.id,
          importancia_decisor: ev.importancia_decisor,
          alcance_elegido: f.alcance === 'Ambos' ? ev.alcance_elegido : null,
          subfactores: ir.relevante
            ? f.subfactores.map(s => ({ subfactor_id: s.id, valor: evSubfactores[s.id] || 1 }))
            : [],
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

  const subtitles = [
    'Ajuste la importancia de cada factor según su organización.',
    'Evalúe el cumplimiento de los subfactores para cada factor relevante.',
    'Resultado del análisis FODA y recomendación final.',
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Nueva Evaluación</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{subtitles[step]}</p>
        </div>
        <input
          placeholder="Nombre de la evaluación…"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
            padding: '8px 14px', fontSize: 13, outline: 'none', width: 280,
            fontFamily: 'inherit',
          }}
        />
      </div>

      <Stepper steps={STEPS} current={step} />

      {error && <div className="error-msg">{error}</div>}

      <div>
        {step === 0 && <StepFactores factores={factores} evaluacion={evFactores} onChange={setEvFactores} />}
        {step === 1 && <StepSubfactores factores={factores} evaluacionFactores={evFactores} subfactores={evSubfactores} onChange={setEvSubfactores} />}
        {step === 2 && <StepResultados resultado={resultado} />}
      </div>

      <div className="wizard-actions">
        {step > 0 && step < 2 ? (
          <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>← Anterior</button>
        ) : <div />}
        <div style={{ display: 'flex', gap: 10 }}>
          {step === 0 && (
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              Siguiente: Subfactores →
            </button>
          )}
          {step === 1 && (
            <button className="btn btn-primary" disabled={loading} onClick={handleCalcular}>
              {loading ? 'Calculando…' : 'Ver Resultados →'}
            </button>
          )}
          {step === 2 && (
            <button className="btn btn-secondary" onClick={() => { setStep(0); setResultado(null) }}>
              Nueva evaluación
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
