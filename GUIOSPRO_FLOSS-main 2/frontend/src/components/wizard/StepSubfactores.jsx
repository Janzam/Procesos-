// origen: main.py (Tab 2) | cambio: lista de progreso + selector de 4 opciones y avance automático
import { useState, useRef, useEffect } from 'react'
import { esRelevante, pedirSugerencias } from '../../api/guiosad.js'

// Texto completo de la escala original y su versión corta para los botones
const NIVELES_SUB = ['No cumple el requisito', 'Desconozco si cumple', 'Cumple parcialmente', 'Cumple el requisito']
const NIVELES_CORTO = ['No cumple', 'No lo sé', 'Parcial', 'Cumple']

// Marca con la que setSaltandoA distingue el salto al siguiente factor del
// salto final a Resultados.
const FIN = Symbol('fin')

function SugerenciaIA({ sugerencia, valorActual, esDeIA, onAplicar }) {
  const aplicada = esDeIA && valorActual === sugerencia.valor
  return (
    <div className={`ia-sug${aplicada ? ' ia-sug-aplicada' : ''}`}>
      <div className="ia-sug-cab">
        <span className="ia-sug-marca">IA</span>
        <span className="ia-sug-valor">{sugerencia.valor_etiqueta}</span>
        <span className={`ia-sug-conf ia-conf-${sugerencia.confianza}`}>
          confianza {sugerencia.confianza}
        </span>
        {aplicada
          ? <span className="ia-sug-ok">Aplicada</span>
          : <button type="button" className="btn btn-outline btn-xs" onClick={onAplicar}>Aplicar</button>}
      </div>
      {sugerencia.justificacion && <p className="ia-sug-just">{sugerencia.justificacion}</p>}
    </div>
  )
}

export default function StepSubfactores({
  factores, evaluacionFactores, subfactores, onChange, matrizIR, onCompletado,
  software, origenes = {}, onOrigenes, iaDisponible,
}) {
  const relevantes = factores.filter(f => esRelevante(f, evaluacionFactores, matrizIR))

  const [selId, setSelId] = useState(relevantes[0]?.id || null)
  // Sugerencias ya pedidas, por factor. Se conservan mientras dure el paso para
  // no volver a consultar al modelo al ir y venir entre factores.
  const [sugerencias, setSugerencias] = useState({})
  const [cargandoIA, setCargandoIA] = useState(false)
  const [errorIA, setErrorIA] = useState(null)
  const [saltandoA, setSaltandoA] = useState(null)
  const timerRef = useRef(null)
  const panelRef = useRef(null)

  // El salto a resultados se dispara desde un temporizador, cuando el padre ya ha
  // vuelto a renderizar con la última respuesta. Si llamara al onCompletado
  // capturado al pulsar, ejecutaría el cálculo con el estado anterior: daría por
  // sin responder justo esa última pregunta y la guardaría como «No cumple». La
  // referencia apunta siempre al onCompletado del render más reciente.
  const onCompletadoRef = useRef(onCompletado)
  useEffect(() => { onCompletadoRef.current = onCompletado })

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

  function handleSub(id, val, origen = 'manual') {
    const nuevos = { ...subfactores, [id]: val }
    onChange(nuevos)
    // RF-19: se registra si la respuesta la introdujo el decisor o si procede de
    // una sugerencia que aceptó.
    onOrigenes?.({ ...origenes, [id]: origen })
    if (!factor) return

    // Al completar el último subfactor pendiente, saltar solo al siguiente factor
    const estabaIncompleto = faltanDe(factor) > 0
    const quedaCompleto = faltanDe(factor, nuevos) === 0
    if (!estabaIncompleto || !quedaCompleto) return

    const desde = relevantes.findIndex(f => f.id === factor.id)
    const siguiente =
      relevantes.slice(desde + 1).find(f => faltanDe(f, nuevos) > 0) ||
      relevantes.find(f => faltanDe(f, nuevos) > 0)

    clearTimeout(timerRef.current)

    // No queda ningún factor pendiente: la evaluación está completa y se pasa
    // directamente a Resultados, sin obligar a pulsar el botón de la barra.
    if (!siguiente) {
      if (!onCompletado) return
      setSaltandoA(FIN)
      timerRef.current = setTimeout(() => { setSaltandoA(null); onCompletadoRef.current?.() }, 750)
      return
    }

    setSaltandoA(siguiente.nombre)
    timerRef.current = setTimeout(() => irA(siguiente.id, true), 750)
  }

  async function pedirIA() {
    if (!factor) return
    setCargandoIA(true)
    setErrorIA(null)
    try {
      const res = await pedirSugerencias(factor.id, software)
      setSugerencias(prev => ({ ...prev, [factor.id]: res.valoraciones }))
    } catch (e) {
      setErrorIA(e.message)
    } finally {
      setCargandoIA(false)
    }
  }

  // Aplicar todas de golpe pasa por el mismo camino que una a una: se escriben
  // como respuestas del decisor marcadas con su procedencia.
  function aplicarTodas(lista) {
    const nuevos = { ...subfactores }
    const nuevosOrigenes = { ...origenes }
    lista.forEach(v => { nuevos[v.subfactor_id] = v.valor; nuevosOrigenes[v.subfactor_id] = 'sugerido_ia' })
    onChange(nuevos)
    onOrigenes?.(nuevosOrigenes)
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
              <div className="sub-panel-acciones">
                {iaDisponible && (
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={pedirIA}
                    disabled={cargandoIA}
                    title="Propone una valoración para cada criterio de este factor. Nada se guarda sin que usted lo acepte."
                  >
                    {cargandoIA ? 'Consultando…' : 'Sugerir con IA'}
                  </button>
                )}
                <span className="sub-panel-cont">{respondidos}<small>/{total}</small></span>
              </div>
            </header>

            <div className="sub-panel-barra"><span style={{ width: pct + '%' }} /></div>

            {errorIA && <div className="error-msg">{errorIA}</div>}

            {sugerencias[factor.id]?.length > 0 && (
              <div className="ia-barra">
                <span>
                  El asistente propone {sugerencias[factor.id].length} valoraciones.
                  Revíselas: ninguna se guarda hasta que usted la acepte.
                </span>
                <button type="button" className="btn btn-outline btn-xs"
                        onClick={() => aplicarTodas(sugerencias[factor.id])}>
                  Aplicar todas
                </button>
              </div>
            )}

            {saltandoA && (
              <div className="sub-salto">
                {saltandoA === FIN
                  ? <>Evaluación completada · calculando los <strong>resultados</strong>…</>
                  : <>Factor completado · pasando a <strong>{saltandoA}</strong>…</>}
              </div>
            )}

            <div className="sub-preguntas">
              {factor.subfactores.map((s, idx) => {
                const val = subfactores[s.id]
                const respondido = val !== undefined
                const sug = sugerencias[factor.id]?.find(v => v.subfactor_id === s.id)
                return (
                  <div className={`sub-row${respondido ? '' : ' sub-row-pendiente'}`} key={s.id}>
                    <div className="sub-pregunta">
                      <span className="sub-num">{String(idx + 1).padStart(2, '0')}</span>
                      <span>{s.nombre}</span>
                    </div>
                    <div className="sub-controles">
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
                      {sug && (
                        <SugerenciaIA
                          sugerencia={sug}
                          valorActual={val}
                          esDeIA={origenes[s.id] === 'sugerido_ia'}
                          onAplicar={() => handleSub(s.id, sug.valor, 'sugerido_ia')}
                        />
                      )}
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
