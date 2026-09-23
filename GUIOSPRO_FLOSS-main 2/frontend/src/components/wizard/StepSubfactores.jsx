// origen: main.py (Tab 2) | cambio: lista de progreso + selector de 4 opciones y avance automático
import { useState, useRef, useEffect } from 'react'
import { calcularIR } from '../../api/guiosad.js'

// Texto completo de la escala original y su versión corta para los botones
const NIVELES_SUB = ['No cumple el requisito', 'Desconozco si cumple', 'Cumple parcialmente', 'Cumple el requisito']
const NIVELES_CORTO = ['No cumple', 'No lo sé', 'Parcial', 'Cumple']

// Misma regla de relevancia que usa el backend: un factor que el decisor no tocó
// se evalúa igualmente con ID = 1.
function esRelevante(f, evaluacionFactores, matrizIR) {
  const id = evaluacionFactores[f.id]?.importancia_decisor ?? 1
  return calcularIR(matrizIR, f.importancia_sugerida, id).relevante
}

export default function StepSubfactores({ factores, evaluacionFactores, subfactores, onChange, matrizIR }) {
  const relevantes = factores.filter(f => esRelevante(f, evaluacionFactores, matrizIR))

  const [selId, setSelId] = useState(relevantes[0]?.id || null)
  const [saltandoA, setSaltandoA] = useState(null)
  const timerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const factor = relevantes.find(f => f.id === selId) || relevantes[0]

  const respondidosDe = f => f.subfactores.filter(s => subfactores[s.id] !== undefined).length
  const faltanDe = (f, mapa = subfactores) => f.subfactores.filter(s => mapa[s.id] === undefined).length
  const pendientesTotal = relevantes.reduce((n, f) => n + faltanDe(f), 0)

  function irA(id, conScroll) {
    setSelId(id)
    setSaltandoA(null)
    if (conScroll) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSub(id, val) {
    const nuevos = { ...subfactores, [id]: val }
    onChange(nuevos)
    if (!factor) return

    // Al completar el último subfactor pendiente, saltar solo al siguiente factor
    const estabaIncompleto = faltanDe(factor) > 0
    const quedaCompleto = faltanDe(factor, nuevos) === 0
    if (!estabaIncompleto || !quedaCompleto) return

    const desde = relevantes.findIndex(f => f.id === factor.id)
    const siguiente =
      relevantes.slice(desde + 1).find(f => faltanDe(f, nuevos) > 0) ||
      relevantes.find(f => faltanDe(f, nuevos) > 0)
    if (!siguiente) return

    clearTimeout(timerRef.current)
    setSaltandoA(siguiente.nombre)
    timerRef.current = setTimeout(() => irA(siguiente.id, true), 750)
  }

  if (relevantes.length === 0) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
        </svg>
        <p>No hay factores relevantes. Vuelva al paso Factores y suba la importancia de algún factor.</p>
      </div>
    )
  }

  const respondidos = factor ? respondidosDe(factor) : 0
  const total = factor?.subfactores.length || 0
  const pct = total ? Math.round((respondidos / total) * 100) : 0

  return (
    <div>
      <div className="paso-aviso">
        <span><strong>{relevantes.length}</strong> factores a evaluar</span>
        {pendientesTotal > 0
          ? <span className="paso-aviso-muted">
              Quedan {pendientesTotal} preguntas; sin responder se cuentan como «No cumple»
            </span>
          : <span className="paso-aviso-ok">Todas las preguntas respondidas</span>}
      </div>

      <div className="sub-layout">
        {/* Lista de progreso por factor */}
        <nav className="fl-lista" aria-label="Factores a evaluar">
          {relevantes.map((f, i) => {
            const hechos = respondidosDe(f)
            const completo = hechos === f.subfactores.length
            const activo = factor?.id === f.id
            return (
              <button
                key={f.id}
                className={`fl-item${activo ? ' activo' : ''}${completo ? ' completo' : ''}`}
                onClick={() => { clearTimeout(timerRef.current); irA(f.id, false) }}
              >
                <span className="fl-num">{completo ? '✓' : String(i + 1).padStart(2, '0')}</span>
                <span className="fl-body">
                  <span className="fl-nombre">{f.nombre}</span>
                  <span className="fl-barra">
                    <span style={{ width: `${(hechos / f.subfactores.length) * 100}%` }} />
                  </span>
                </span>
                <span className="fl-cont">{hechos}/{f.subfactores.length}</span>
              </button>
            )
          })}
        </nav>

        {/* Preguntas del factor seleccionado */}
        {factor && (
          <div className="sub-panel" ref={panelRef}>
            <header className="sub-panel-head">
              <div>
                <h2 className="sub-panel-titulo">{factor.nombre}</h2>
                <p className="sub-panel-sub">Indique el grado de cumplimiento de cada requisito</p>
              </div>
              <span className="sub-panel-cont">{respondidos}<small>/{total}</small></span>
            </header>

            <div className="sub-panel-barra"><span style={{ width: pct + '%' }} /></div>

            {saltandoA && (
              <div className="sub-salto">Factor completado · pasando a <strong>{saltandoA}</strong>…</div>
            )}

            <div className="sub-preguntas">
              {factor.subfactores.map((s, idx) => {
                const val = subfactores[s.id]
                const respondido = val !== undefined
                return (
                  <div className={`sub-row${respondido ? '' : ' sub-row-pendiente'}`} key={s.id}>
                    <div className="sub-pregunta">
                      <span className="sub-num">{String(idx + 1).padStart(2, '0')}</span>
                      <span>{s.nombre}</span>
                    </div>
                    <div className="segmented segmented-sub" role="group" aria-label={s.nombre}>
                      {NIVELES_CORTO.map((corto, i) => (
                        <button
                          key={corto}
                          type="button"
                          className={`seg-btn${val === i + 1 ? ` seg-activo nivel-${i + 1}` : ''}`}
                          aria-pressed={val === i + 1}
                          title={NIVELES_SUB[i]}
                          onClick={() => handleSub(s.id, i + 1)}
                        >
                          {corto}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
