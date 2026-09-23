// origen: main.py (flujo 6 pasos) | cambio: wizard con Stepper visual y layout moderno
import { useState, useEffect } from 'react'
import { getFactores, getMatrizIR, crearEvaluacion, calcularIR } from '../api/guiosad.js'
import Stepper from '../components/Stepper.jsx'
import StepSoftware, { SOFTWARE_VACIO } from '../components/wizard/StepSoftware.jsx'
import StepFactores from '../components/wizard/StepFactores.jsx'
import StepSubfactores from '../components/wizard/StepSubfactores.jsx'
import StepResultados from '../components/wizard/StepResultados.jsx'

const STEPS = ['Software', 'Factores', 'Subfactores', 'Resultados']

// Nombre de la evaluación a partir de los datos del software (todos opcionales)
function nombreEvaluacion(sw) {
  const base = [sw.nombre, sw.version].filter(Boolean).join(' ').trim()
  if (!base) return 'Evaluación sin nombre'
  return sw.organizacion ? `${base} — ${sw.organizacion}` : base
}

// Estado del wizard persistido en localStorage: al recargar la página se
// continúa donde se estaba; solo se borra con "Nueva evaluación".
const STORAGE_KEY = 'guiosad-evaluacion'

function leerEstadoGuardado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    // Si se guardó en Resultados pero sin resultado, volver a Subfactores
    if (s.step === 3 && !s.resultado) s.step = 2
    return s
  } catch {
    return null
  }
}

export default function EvaluacionPage() {
  const [guardado] = useState(leerEstadoGuardado)
  const [step, setStep] = useState(guardado?.step ?? 0)
  const [factores, setFactores] = useState([])
  const [software, setSoftware] = useState(guardado?.software ?? SOFTWARE_VACIO)
  const [evFactores, setEvFactores] = useState(guardado?.evFactores ?? {})
  const [evSubfactores, setEvSubfactores] = useState(guardado?.evSubfactores ?? {})
  const [resultado, setResultado] = useState(guardado?.resultado ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, software, evFactores, evSubfactores, resultado }))
    } catch { /* modo privado o sin espacio */ }
  }, [step, software, evFactores, evSubfactores, resultado])

  const [cargandoFactores, setCargandoFactores] = useState(true)
  const [matrizIR, setMatrizIR] = useState(null)

  // Carga factores y matriz IR con reintentos: en Docker el backend tarda unos
  // segundos en arrancar (migraciones + fixtures) y el primer fetch puede fallar.
  // La matriz IR viene del backend para no duplicar la fórmula en JavaScript.
  async function cargarFactores(intentos = 5) {
    setCargandoFactores(true)
    setError(null)
    for (let i = 0; i < intentos; i++) {
      try {
        const [data, ir] = await Promise.all([getFactores(), getMatrizIR()])
        setFactores(data)
        setMatrizIR(ir.matriz)
        setCargandoFactores(false)
        return
      } catch {
        if (i < intentos - 1) await new Promise(r => setTimeout(r, 2000))
      }
    }
    setCargandoFactores(false)
    setError('No se pudo cargar la lista de factores. Verifique que el backend esté en ejecución.')
  }

  useEffect(() => { cargarFactores() }, [])

  // Subfactores sin responder de los factores que sí entrarán en el cálculo
  function contarPendientes() {
    return factores.reduce((n, f) => {
      const ev = evFactores[f.id]
      const id = ev ? ev.importancia_decisor : 1
      if (!calcularIR(matrizIR, f.importancia_sugerida, id).relevante) return n
      return n + f.subfactores.filter(s => evSubfactores[s.id] === undefined).length
    }, 0)
  }

  async function handleCalcular() {
    // El valor por defecto de un subfactor sin responder es 1 ("No cumple").
    // No se cambia el cálculo, pero se avisa antes en vez de aplicarlo en silencio.
    const pendientes = contarPendientes()
    if (pendientes > 0) {
      const seguir = window.confirm(
        `Hay ${pendientes} subfactor${pendientes === 1 ? '' : 'es'} sin responder.\n\n` +
        'Se calcularán como «No cumple el requisito», lo que baja la ponderación ' +
        'y puede cambiar la recomendación final.\n\n¿Desea continuar igualmente?'
      )
      if (!seguir) return
    }

    setLoading(true)
    setError(null)
    try {
      const factoresPayload = factores.map(f => {
        const ev = evFactores[f.id] || { importancia_decisor: 1, alcance_elegido: f.alcance !== 'Ambos' ? f.alcance : 'Interno' }
        const ir = calcularIR(matrizIR, f.importancia_sugerida, ev.importancia_decisor)
        return {
          factor_id: f.id,
          importancia_decisor: ev.importancia_decisor,
          // Para los factores 'Ambos' se envía siempre un alcance explícito: el
          // formulario muestra 'Interno' preseleccionado, así que se manda ese
          // mismo valor en lugar de null (que el backend trataba como Externo).
          alcance_elegido: f.alcance === 'Ambos' ? (ev.alcance_elegido || 'Interno') : null,
          subfactores: ir.relevante
            ? f.subfactores.map(s => ({ subfactor_id: s.id, valor: evSubfactores[s.id] ?? 1 }))
            : [],
        }
      })
      const res = await crearEvaluacion({ nombre: nombreEvaluacion(software), factores: factoresPayload })
      setResultado(res.resultado)
      setStep(3)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleNuevaEvaluacion() {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignorar */ }
    setStep(0)
    setSoftware(SOFTWARE_VACIO)
    setEvFactores({})
    setEvSubfactores({})
    setResultado(null)
  }

  const subtitles = [
    'Indique el software que desea evaluar. Todos los campos son opcionales.',
    'Ajuste la importancia de cada factor según su organización.',
    'Evalúe el cumplimiento de los subfactores para cada factor relevante.',
    'Resultado del análisis FODA y recomendación final.',
  ]

  const titulo = step > 0 && software.nombre
    ? `Evaluación: ${[software.nombre, software.version].filter(Boolean).join(' ')}`
    : 'Nueva Evaluación'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">{titulo}</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>{subtitles[step]}</p>
      </div>

      <Stepper steps={STEPS} current={step} />

      {error && (
        <div className="error-msg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          {factores.length === 0 && !cargandoFactores && (
            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => cargarFactores()}>
              Reintentar
            </button>
          )}
        </div>
      )}

      <div>
        {step === 0 && <StepSoftware software={software} onChange={setSoftware} onStart={() => setStep(1)} />}
        {(step === 1 || step === 2) && cargandoFactores && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando factores…</p>
        )}
        {step === 1 && !cargandoFactores && <StepFactores factores={factores} evaluacion={evFactores} onChange={setEvFactores} matrizIR={matrizIR} />}
        {step === 2 && !cargandoFactores && <StepSubfactores factores={factores} evaluacionFactores={evFactores} subfactores={evSubfactores} onChange={setEvSubfactores} matrizIR={matrizIR} />}
        {step === 3 && <StepResultados resultado={resultado} nombre={nombreEvaluacion(software)} />}
      </div>

      {step > 0 && (
        <div className="wizard-actions">
          {step < 3 ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>← Anterior</button>
              <button
                className="btn btn-outline"
                onClick={() => { if (window.confirm('¿Descartar esta evaluación y empezar con otro sistema?')) handleNuevaEvaluacion() }}
              >
                Evaluar otro sistema
              </button>
            </div>
          ) : <div />}
          <div style={{ display: 'flex', gap: 10 }}>
            {step === 1 && (
              <button className="btn btn-primary" disabled={factores.length === 0} onClick={() => setStep(2)}>
                Siguiente: Subfactores →
              </button>
            )}
            {step === 2 && (
              <button className="btn btn-primary" disabled={loading} onClick={handleCalcular}>
                {loading ? 'Calculando…' : 'Ver Resultados →'}
              </button>
            )}
            {step === 3 && (
              <button className="btn btn-secondary" onClick={handleNuevaEvaluacion}>
                Nueva evaluación
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
