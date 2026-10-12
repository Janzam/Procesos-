// Análisis del resultado: explica por qué la recomendación es la que es.
//
// No hay aquí ninguna fórmula alternativa. Todo lo que se muestra se deriva del
// resultado que ya calculó la metodología: qué factores lo causan, de qué
// información depende cada uno, qué haría falta para mejorarlo y qué respuestas
// lo deciden. El sistema no recalcula nada con otros criterios.
import { useState, useEffect } from 'react'
import {
  getDiagnostico, getDeterminantes, pedirPlanNarrado, pedirInforme, getEstadoIA,
} from '../api/guiosad.js'
import { FODA_CLASS } from '../utils/recomendacion.js'

const ACENTO = { A: 'acento-a', B: 'acento-b', C: 'acento-c' }

function Seccion({ titulo, apunte, children }) {
  return (
    <section className="an-seccion">
      <header className="an-seccion-cab">
        <h3 className="an-seccion-titulo">{titulo}</h3>
        {apunte && <span className="an-seccion-apunte">{apunte}</span>}
      </header>
      {children}
    </section>
  )
}

function Badge({ categoria }) {
  if (!categoria) return <span className="an-vacio">—</span>
  return <span className={`badge ${FODA_CLASS[categoria] || ''}`}>{categoria}</span>
}

function Narracion({ texto, error }) {
  if (!texto) {
    return error
      ? <p className="an-nota">El asistente no pudo redactarlo: {error} El análisis que sigue no depende de él.</p>
      : null
  }
  return (
    <div className="ia-texto">
      <div className="ia-texto-cab"><span className="ia-sug-marca">IA</span> Redactado a partir del análisis</div>
      {texto.split(/\n{2,}/).map((parrafo, i) => <p key={i}>{parrafo}</p>)}
    </div>
  )
}

// ── Factores que causan la recomendación ────────────────────────────
function Causantes({ diag }) {
  if (!diag.causantes.length) return null
  return (
    <Seccion
      titulo="Factores que causan este resultado"
      apunte={`${diag.causantes.length} de ${diag.factores_relevantes} factores evaluados`}
    >
      <div className="an-tabla-wrap">
        <table className="foda-table">
          <thead>
            <tr>
              <th>Factor</th>
              <th>Clasificación</th>
              <th>Ponderación</th>
              <th>De dónde sale</th>
            </tr>
          </thead>
          <tbody>
            {diag.causantes.map(c => (
              <tr key={c.factor_id}>
                <td className="an-factor">
                  {c.factor_nombre}
                  <span className="an-sub">{c.dimension} · {c.ir_etiqueta}</span>
                </td>
                <td><Badge categoria={c.categoria} /></td>
                <td className="an-pond">
                  <strong>{c.ponderacion.toFixed(2)}</strong>
                  <span className="an-sub">umbral {c.umbral.toFixed(2)}</span>
                </td>
                <td className="an-motivo">
                  {c.observacion}
                  {c.subfactores_sin_conocer > 0 && (
                    <span className="an-chip-aviso">
                      {c.subfactores_sin_conocer} de {c.subfactores_totales} sin conocer
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  )
}

// ── Qué haría falta para mejorar ────────────────────────────────────
function Plan({ plan }) {
  if (!plan || plan.recomendacion_actual === 'A' || !plan.bloqueantes?.length) return null

  return (
    <Seccion
      titulo="Qué haría falta para mejorar"
      apunte={plan.alcanzable && plan.objetivo
        ? `Resolviéndolos, la recomendación pasaría a ${plan.objetivo}`
        : 'Alguno no alcanza el umbral ni con todas sus respuestas al máximo'}
    >
      <Narracion texto={plan.narracion} error={plan.narracion_error} />
      <div className="an-tabla-wrap">
        <table className="foda-table">
          <thead>
            <tr><th>Factor</th><th>Ponderación</th><th>Qué hace falta</th></tr>
          </thead>
          <tbody>
            {plan.bloqueantes.map(b => (
              <tr key={b.factor_id}>
                <td className="an-factor">
                  {b.factor_nombre}
                  <span className="an-sub">{b.dimension} · {b.ir_etiqueta}</span>
                </td>
                <td className="an-pond">
                  {b.ponderacion_actual.toFixed(2)} → <strong>{b.ponderacion_objetivo.toFixed(2)}</strong>
                </td>
                <td className="an-motivo">
                  {b.subfactores_a_mejorar === null
                    ? 'No alcanza el umbral ni con todas sus respuestas al máximo.'
                    : <>Elevar <strong>{b.subfactores_a_mejorar}</strong> de sus {b.subfactores_totales}{' '}
                       {b.subfactores_totales === 1 ? 'criterio' : 'criterios'}.</>}
                  {b.subfactores_sin_conocer > 0 && (
                    <span className="an-chip-aviso">
                      {b.subfactores_sin_conocer} sin conocer: verificarlos es lo más barato
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  )
}

// ── Respuestas que deciden ──────────────────────────────────────────
function Determinantes({ det }) {
  if (!det) return null
  if (!det.total_determinantes) {
    return (
      <Seccion titulo="Respuestas que deciden el resultado">
        <p className="an-texto">
          Ninguna respuesta aislada cambiaría la recomendación: el resultado no cuelga de una
          sola de las {det.total_respuestas} respuestas.
        </p>
      </Seccion>
    )
  }
  return (
    <Seccion
      titulo="Respuestas que deciden el resultado"
      apunte={`${det.total_determinantes} de ${det.total_respuestas}`}
    >
      <p className="an-texto">
        Contestadas de otro modo, estas respuestas cambiarían por sí solas la recomendación.
        Conviene confirmarlas antes de decidir.
      </p>
      <ul className="an-lista">
        {det.determinantes.map(d => (
          <li key={d.subfactor_id}>
            <div className="an-factor">
              {d.factor_nombre}
              <span className="an-sub">{d.subfactor_nombre}</span>
            </div>
            <div className="an-cambio">
              Respondiendo <strong>{d.valor_alternativo}</strong> en vez de <strong>{d.valor_actual}</strong>,
              la recomendación pasaría a <strong>{d.recomendacion_resultante}</strong>.
            </div>
          </li>
        ))}
      </ul>
    </Seccion>
  )
}

// ── Avisos generales ────────────────────────────────────────────────
function Avisos({ diag }) {
  if (!diag.avisos.length) return null
  return (
    <Seccion titulo="A tener en cuenta">
      <ul className="an-avisos">
        {diag.avisos.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </Seccion>
  )
}

// ── Informe ejecutivo (solo con el asistente configurado) ───────────
function Informe({ evaluacionId, disponible }) {
  const [texto, setTexto] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  if (!disponible) return null

  async function pedir() {
    setCargando(true)
    setError(null)
    try {
      const res = await pedirInforme(evaluacionId)
      setTexto(res.informe)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Seccion titulo="Informe ejecutivo">
      {!texto && (
        <div className="an-accion">
          <p className="an-texto">
            El asistente puede redactar este análisis en prosa para presentarlo a la dirección.
          </p>
          <button className="btn btn-outline btn-xs" onClick={pedir} disabled={cargando}>
            {cargando ? 'Redactando…' : 'Redactar informe'}
          </button>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
      <Narracion texto={texto} />
    </Seccion>
  )
}

// Si el decisor dejó el análisis abierto, sigue abierto la próxima vez: es la
// misma preferencia que ya se recuerda para los gráficos y la lista del historial.
const ABIERTO_KEY = 'guiosad-analisis-abierto'
function leerAbierto() {
  try { return localStorage.getItem(ABIERTO_KEY) === 'si' } catch { return false }
}

export default function AnalisisResultado({ evaluacionId }) {
  const [abierto, setAbierto] = useState(leerAbierto)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [ia, setIa] = useState(false)

  useEffect(() => {
    if (!abierto || datos || cargando) return
    setCargando(true)
    setError(null)
    // Las tres consultas son deterministas y baratas: se piden a la vez y el
    // análisis se muestra entero, sin pestañas que obliguen a ir y venir.
    Promise.all([
      getDiagnostico(evaluacionId),
      getDeterminantes(evaluacionId),
      pedirPlanNarrado(evaluacionId),
    ])
      .then(([diag, det, plan]) => setDatos({ diag, det, plan }))
      .catch(e => setError(e.message))
      .finally(() => setCargando(false))
  }, [abierto, evaluacionId, datos, cargando])

  useEffect(() => {
    if (!abierto) return
    getEstadoIA().then(e => setIa(Boolean(e.disponible))).catch(() => setIa(false))
  }, [abierto])

  useEffect(() => {
    try { localStorage.setItem(ABIERTO_KEY, abierto ? 'si' : 'no') } catch { /* modo privado */ }
  }, [abierto])

  if (!evaluacionId) return null

  if (!abierto) {
    return (
      <div className="an-llamada">
        <div>
          <div className="an-llamada-titulo">¿Por qué este resultado?</div>
          <div className="an-llamada-texto">
            Qué factores lo causan, de qué información depende cada uno, qué haría falta para
            mejorarlo y qué respuestas lo deciden.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setAbierto(true)}>
          Analizar el resultado
        </button>
      </div>
    )
  }

  const diag = datos?.diag

  return (
    <div className={`card an-card ${diag ? ACENTO[diag.recomendacion] || '' : ''}`}>
      <header className="an-cab">
        <div>
          <h2 className="an-titulo">{diag ? diag.titulo : 'Análisis del resultado'}</h2>
          {diag && <p className="an-resumen">{diag.resumen}</p>}
        </div>
        <button className="btn btn-outline btn-xs" onClick={() => setAbierto(false)}>Cerrar</button>
      </header>

      {cargando && <p className="an-vacio an-cuerpo">Analizando…</p>}
      {error && <div className="error-msg" style={{ margin: 16 }}>{error}</div>}

      {datos && (
        <div className="an-cuerpo">
          {diag.cobertura_global !== null && (
            <div className="an-metricas">
              <div className="an-metrica">
                <span className="an-metrica-valor">{diag.factores_desfavorables}</span>
                <span className="an-metrica-etiqueta">factores desfavorables</span>
              </div>
              <div className="an-metrica">
                <span className="an-metrica-valor">{Math.round(diag.cobertura_global * 100)} %</span>
                <span className="an-metrica-etiqueta">de las respuestas se conocen</span>
              </div>
              <div className="an-metrica">
                <span className="an-metrica-valor">{datos.det?.total_determinantes ?? '—'}</span>
                <span className="an-metrica-etiqueta">respuestas deciden el resultado</span>
              </div>
            </div>
          )}

          <Causantes diag={diag} />
          <Plan plan={datos.plan} />
          <Determinantes det={datos.det} />
          <Avisos diag={diag} />
          <Informe evaluacionId={evaluacionId} disponible={ia} />
        </div>
      )}
    </div>
  )
}
