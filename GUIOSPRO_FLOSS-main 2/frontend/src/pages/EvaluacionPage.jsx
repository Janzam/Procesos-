// origen: main.py (flujo 6 pasos) | cambio: wizard con Stepper visual y layout moderno
import { useState, useEffect } from 'react'
import {
  getFactores, getMatrizIR, crearEvaluacion, actualizarEvaluacion,
  getEvaluacion, esRelevante, getEstadoIA,
} from '../api/guiosad.js'
import {
  SOFTWARE_VACIO, nombreCorto, nombreEvaluacion, softwareAPayload, softwareDesdeApi,
} from '../utils/software.js'
import Stepper from '../components/Stepper.jsx'
import StepSoftware from '../components/wizard/StepSoftware.jsx'
import StepFactores from '../components/wizard/StepFactores.jsx'
import StepSubfactores from '../components/wizard/StepSubfactores.jsx'
import StepResultados from '../components/wizard/StepResultados.jsx'

const STEPS = ['Software', 'Factores', 'Subfactores', 'Resultados']
const SUBTITULOS = [
  'Identifique el producto que va a analizar.',
  'Ajuste la importancia de cada factor según su organización.',
  'Evalúe el cumplimiento de los subfactores para cada factor relevante.',
  'Resultado del análisis FODA y recomendación final.',
]

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

export default function EvaluacionPage({ editarId, onFinEdicion }) {
  const [guardado] = useState(leerEstadoGuardado)
  const [step, setStep] = useState(guardado?.step ?? 0)
  const [factores, setFactores] = useState([])
  const [software, setSoftware] = useState(guardado?.software ?? SOFTWARE_VACIO)
  const [evFactores, setEvFactores] = useState(guardado?.evFactores ?? {})
  const [evSubfactores, setEvSubfactores] = useState(guardado?.evSubfactores ?? {})
  // Procedencia de cada respuesta (RF-19): manual o sugerencia aceptada.
  const [evOrigenes, setEvOrigenes] = useState(guardado?.evOrigenes ?? {})
  const [iaDisponible, setIaDisponible] = useState(false)
  // Id de la evaluación que se está editando. Mientras no sea nulo, guardar
  // reemplaza esa evaluación en vez de crear una nueva.
  const [editando, setEditando] = useState(null)
  const [resultado, setResultado] = useState(guardado?.resultado ?? null)
  // Id de la evaluación guardada: lo necesita el panel de análisis para
  // recalcular sobre ella sin volver a enviar las respuestas.
  const [evaluacionId, setEvaluacionId] = useState(guardado?.evaluacionId ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cargandoFactores, setCargandoFactores] = useState(true)
  const [matrizIR, setMatrizIR] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, software, evFactores, evSubfactores, evOrigenes, resultado, evaluacionId }))
    } catch { /* modo privado o sin espacio */ }
  }, [step, software, evFactores, evSubfactores, evOrigenes, resultado, evaluacionId])

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

  // Al llegar desde el historial con una evaluación que editar, sus respuestas
  // sustituyen al borrador que hubiera en curso.
  useEffect(() => {
    if (!editarId) return
    let vigente = true
    getEvaluacion(editarId).then(ev => {
      if (!vigente) return
      const r = ev.respuestas || {}
      setSoftware(softwareDesdeApi(ev.software))
      setEvFactores(r.factores || {})
      setEvSubfactores(r.subfactores || {})
      setEvOrigenes(r.origenes || {})
      setResultado(ev.resultado)
      setEvaluacionId(ev.id)
      setEditando(ev.id)
      setStep(1)
    }).catch(() => setError('No se pudo cargar la evaluación para editarla.'))
    return () => { vigente = false }
  }, [editarId])

  // El asistente es opcional: si no hay credencial configurada, la interfaz no lo
  // ofrece en vez de mostrar un botón que siempre falla.
  useEffect(() => {
    getEstadoIA().then(e => setIaDisponible(Boolean(e.disponible))).catch(() => setIaDisponible(false))
  }, [])

  // Subfactores sin responder de los factores que sí entrarán en el cálculo
  function contarPendientes() {
    return factores.reduce((n, f) => {
      if (!esRelevante(f, evFactores, matrizIR)) return n
      return n + f.subfactores.filter(s => evSubfactores[s.id] === undefined).length
    }, 0)
  }

  async function handleCalcular() {
    if (loading) return   // evita que el salto automático y el botón disparen dos cálculos

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
        // Un factor sin importancia elegida se envía con la mínima, que es la que
        // muestra el formulario. La entrada puede existir sin nivel si el decisor
        // solo eligió el alcance de un factor 'Ambos'.
        const ev = evFactores[f.id] || {}
        return {
          factor_id: f.id,
          importancia_decisor: ev.importancia_decisor ?? 1,
          // Para los factores 'Ambos' se envía siempre un alcance explícito: el
          // formulario muestra 'Interno' preseleccionado, así que se manda ese
          // mismo valor en lugar de null (que el backend trataba como Externo).
          alcance_elegido: f.alcance === 'Ambos' ? (ev.alcance_elegido || 'Interno') : null,
          subfactores: esRelevante(f, evFactores, matrizIR)
            ? f.subfactores.map(s => ({
                subfactor_id: s.id,
                valor: evSubfactores[s.id] ?? 1,
                origen: evOrigenes[s.id] === 'sugerido_ia' ? 'sugerido_ia' : 'manual',
              }))
            : [],
        }
      })
      // Los datos del software se envían por separado además del nombre compuesto,
      // para que queden consultables en el historial y no solo como texto (RF-02)
      const payload = {
        nombre: nombreEvaluacion(software),
        ...softwareAPayload(software),
        factores: factoresPayload,
      }
      const res = editando
        ? await actualizarEvaluacion(editando, payload)
        : await crearEvaluacion(payload)
      setResultado(res.resultado)
      setEvaluacionId(res.id)
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
    setEvOrigenes({})
    setResultado(null)
    setEvaluacionId(null)
    setEditando(null)
    onFinEdicion?.()
  }

  const titulo = step > 0 && software.nombre
    ? `Evaluación: ${nombreCorto(software)}`
    : 'Nueva Evaluación'

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">{titulo}</h1>
        <p className="page-subtitle" style={{ marginBottom: 0 }}>{SUBTITULOS[step]}</p>
      </div>

      {editando && (
        <div className="aviso-edicion">
          <span>
            Está <strong>editando una evaluación guardada</strong>. Al terminar, sus respuestas
            reemplazarán a las anteriores; el historial no creará una entrada nueva.
          </span>
          <button className="btn btn-outline btn-xs" onClick={handleNuevaEvaluacion}>
            Cancelar edición
          </button>
        </div>
      )}

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
        {step === 2 && !cargandoFactores && (
          <StepSubfactores
            factores={factores}
            evaluacionFactores={evFactores}
            subfactores={evSubfactores}
            onChange={setEvSubfactores}
            matrizIR={matrizIR}
            onCompletado={handleCalcular}
            software={software}
            origenes={evOrigenes}
            onOrigenes={setEvOrigenes}
            iaDisponible={iaDisponible}
          />
        )}
        {step === 3 && <StepResultados resultado={resultado} nombre={nombreEvaluacion(software)} evaluacionId={evaluacionId} />}
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
                {loading ? 'Guardando…' : editando ? 'Guardar cambios →' : 'Ver Resultados →'}
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
