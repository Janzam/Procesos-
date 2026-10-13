// Análisis del resultado: explica por qué la recomendación es la que es.
//
// No hay aquí ninguna fórmula alternativa. Todo lo que se muestra se deriva del
// resultado que ya calculó la metodología: qué factores lo causan, de qué
// información depende cada uno, qué haría falta para mejorarlo y qué respuestas
// lo deciden. Se presenta en pestañas, cada una con su color, y con un mini
// diagrama de líneas que sitúa cada factor en la escala 1–4 frente al umbral.
import { useState, useEffect } from 'react'
import {
  getDiagnostico, getDeterminantes, pedirPlanNarrado, pedirInforme, getEstadoIA,
} from '../api/guiosad.js'
import { FODA_CLASS } from '../utils/recomendacion.js'
import { IcoFactores, IcoMedidor, IcoResultados, IcoAlerta, IcoChispa } from './Iconos.jsx'

const ACENTO = { A: 'acento-a', B: 'acento-b', C: 'acento-c' }
const COLOR_CAT = {
  Fortaleza: 'var(--foda-f)', Oportunidad: 'var(--foda-o)', Debilidad: 'var(--foda-d)', Amenaza: 'var(--foda-a)',
}
const UMBRAL = 3

const PESTANAS = [
  { id: 'causas',       etiqueta: 'Causas',       tono: 'azul',   Icono: IcoFactores },
  { id: 'mejora',       etiqueta: 'Mejora',       tono: 'verde',  Icono: IcoMedidor },
  { id: 'sensibilidad', etiqueta: 'Sensibilidad', tono: 'morado', Icono: IcoResultados },
  { id: 'avisos',       etiqueta: 'Avisos',       tono: 'ambar',  Icono: IcoAlerta },
  { id: 'informe',      etiqueta: 'Informe IA',   tono: 'rosa',   Icono: IcoChispa, soloIA: true },
]

// Posición en la pista de una ponderación de la escala 1–4.
const pos = v => `${((Math.min(Math.max(v, 1), 4) - 1) / 3) * 100}%`

// Mini diagrama de líneas: cada factor es un punto en la escala 1–4 unido por
// una línea al umbral de 3,0; la longitud de la línea es lo que le falta.
function MiniLineas({ filas, leyenda }) {
  return (
    <div className="ml">
      <div className="ml-escala" aria-hidden="true">
        <span style={{ left: pos(1) }}>1</span>
        <span style={{ left: pos(2) }}>2</span>
        <span className="ml-escala-umbral" style={{ left: pos(UMBRAL) }}>3 · umbral</span>
        <span style={{ left: pos(4) }}>4</span>
      </div>
      {filas.map(f => {
        const ini = Math.min(f.valor, UMBRAL)
        const fin = Math.max(f.valor, UMBRAL)
        return (
          <div className="ml-fila" key={f.id}>
            <span className="ml-nombre" title={f.nombre}>{f.nombre}</span>
            <span className="ml-pista">
              <span className="ml-umbral" style={{ left: pos(UMBRAL) }} />
              <span className="ml-linea" style={{ left: pos(ini), width: `calc(${pos(fin)} - ${pos(ini)})`, background: f.color }} />
              <span className="ml-punto" style={{ left: pos(f.valor), background: f.color }} />
            </span>
            <span className="ml-valor" style={{ color: f.color }}>{f.valor.toFixed(2)}</span>
          </div>
        )
      })}
      {leyenda && <p className="ml-leyenda">{leyenda}</p>}
    </div>
  )
}

function Badge({ categoria }) {
  if (!categoria) return <span className="an-vacio">—</span>
  return <span className={`badge ${FODA_CLASS[categoria] || ''}`}>{categoria}</span>
}

function Narracion({ texto, error }) {
  if (!texto) {
    return error
      ? <p className="an-nota">El asistente no pudo redactarlo: {error} El análisis no depende de él.</p>
      : null
  }
  return (
    <div className="ia-texto">
      <div className="ia-texto-cab"><span className="ia-sug-marca">IA</span> Redactado a partir del análisis</div>
      {texto.split(/\n{2,}/).map((parrafo, i) => <p key={i}>{parrafo}</p>)}
    </div>
  )
}

// ── Causas ──────────────────────────────────────────────────────────
function Causas({ diag }) {
  if (!diag.causantes.length) {
    return (
      <p className="an-texto">
        Ningún factor relevante resultó desfavorable: nada está provocando una recomendación
        peor. Revise las otras pestañas para ver de qué depende la solidez del resultado.
      </p>
    )
  }
  return (
    <>
      <p className="an-texto">
        {diag.causantes.length} de {diag.factores_relevantes} factores evaluados están causando este resultado.
      </p>
      <MiniLineas
        filas={diag.causantes.map(c => ({ id: c.factor_id, nombre: c.factor_nombre, valor: c.ponderacion, color: COLOR_CAT[c.categoria] }))}
        leyenda="Cada punto es la ponderación del factor; la línea, lo que le falta para el umbral de 3,0 a partir del cual sería favorable."
      />
      <div className="an-tabla-wrap">
        <table className="foda-table">
          <thead>
            <tr><th>Factor</th><th>Clasificación</th><th>Ponderación</th><th>De dónde sale</th></tr>
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
                    <span className="an-chip-aviso">{c.subfactores_sin_conocer} de {c.subfactores_totales} sin conocer</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Mejora ──────────────────────────────────────────────────────────
function Mejora({ plan }) {
  if (!plan) return null
  if (plan.recomendacion_actual === 'A') {
    return <p className="an-texto">La recomendación ya es la mejor posible: no hay nada que mejorar para cambiarla.</p>
  }
  if (!plan.bloqueantes?.length) {
    return <p className="an-texto">No hay factores que bloqueen una recomendación mejor.</p>
  }
  return (
    <>
      <p className="an-texto">
        {plan.alcanzable && plan.objetivo
          ? <>Resolviendo estos factores, la recomendación pasaría a <strong>{plan.objetivo}</strong>.</>
          : 'Alguno de estos factores no alcanza el umbral ni con todas sus respuestas al máximo.'}
      </p>
      <Narracion texto={plan.narracion} error={plan.narracion_error} />
      <MiniLineas
        filas={plan.bloqueantes.map(b => ({ id: b.factor_id, nombre: b.factor_nombre, valor: b.ponderacion_actual, color: COLOR_CAT[b.categoria] }))}
        leyenda="Ponderación actual de cada factor bloqueante y la distancia que lo separa del umbral."
      />
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
                    <span className="an-chip-aviso">{b.subfactores_sin_conocer} sin conocer: verificarlos es lo más barato</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Sensibilidad ────────────────────────────────────────────────────
function Sensibilidad({ det }) {
  if (!det) return null
  if (!det.total_determinantes) {
    return (
      <p className="an-texto">
        Ninguna respuesta aislada cambiaría la recomendación: el resultado no cuelga de una
        sola de las {det.total_respuestas} respuestas.
      </p>
    )
  }
  return (
    <>
      <p className="an-texto">
        {det.total_determinantes} de {det.total_respuestas} respuestas cambiarían por sí solas la
        recomendación si se contestaran de otro modo. Conviene confirmarlas antes de decidir.
      </p>
      <ul className="an-lista">
        {det.determinantes.map(d => (
          <li key={d.subfactor_id}>
            <div className="an-factor">
              {d.factor_nombre}
              <span className="an-sub">{d.subfactor_nombre}</span>
            </div>
            <div className="an-cambio">
              <span className="chip chip-morado">{d.valor_actual} → {d.valor_alternativo}</span>
              la recomendación pasaría a <strong>{d.recomendacion_resultante}</strong>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// ── Avisos ──────────────────────────────────────────────────────────
function Avisos({ diag }) {
  if (!diag.avisos.length) {
    return <p className="an-texto">Sin avisos: el resultado no descansa en respuestas sin conocer ni en factores al límite.</p>
  }
  return (
    <ul className="an-avisos">
      {diag.avisos.map((a, i) => <li key={i}>{a}</li>)}
    </ul>
  )
}

// ── Informe ejecutivo (solo con el asistente configurado) ───────────
function Informe({ evaluacionId }) {
  const [texto, setTexto] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

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
    <>
      {!texto && (
        <div className="an-accion">
          <p className="an-texto">
            El asistente puede redactar este análisis en prosa para presentarlo a la dirección.
          </p>
          <button className="btn btn-primary" onClick={pedir} disabled={cargando}>
            {cargando ? 'Redactando…' : 'Redactar informe'}
          </button>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
      <Narracion texto={texto} />
    </>
  )
}

export default function AnalisisResultado({ evaluacionId }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [ia, setIa] = useState(false)
  const [pestana, setPestana] = useState(null)

  // Las tres consultas son deterministas y baratas: se piden a la vez al ver
  // el resultado, sin pedir que se pulse nada.
  useEffect(() => {
    if (!evaluacionId) return
    let vigente = true
    setCargando(true)
    setError(null)
    setDatos(null)
    setPestana(null)
    Promise.all([getDiagnostico(evaluacionId), getDeterminantes(evaluacionId), pedirPlanNarrado(evaluacionId)])
      .then(([diag, det, plan]) => { if (vigente) setDatos({ diag, det, plan }) })
      .catch(e => { if (vigente) setError(e.message) })
      .finally(() => { if (vigente) setCargando(false) })
    getEstadoIA().then(e => { if (vigente) setIa(Boolean(e.disponible)) }).catch(() => {})
    return () => { vigente = false }
  }, [evaluacionId])

  if (!evaluacionId) return null

  const diag = datos?.diag
  const cuentas = datos ? {
    causas: datos.diag.causantes.length,
    mejora: datos.plan?.bloqueantes?.length || 0,
    sensibilidad: datos.det?.total_determinantes || 0,
    avisos: datos.diag.avisos.length,
  } : {}
  // Se abre la primera pestaña con contenido.
  const activa = pestana || PESTANAS.find(p => cuentas[p.id])?.id || 'sensibilidad'
  const visibles = PESTANAS.filter(p => !p.soloIA || ia)

  return (
    <div className={`card an-card ${diag ? ACENTO[diag.recomendacion] || '' : ''}`}>
      <header className="an-cab">
        <div className="an-cab-texto">
          <span className="chip chip-azul">¿Por qué este resultado?</span>
          <h2 className="an-titulo">{diag ? diag.titulo : 'Análisis del resultado'}</h2>
          {diag && <p className="an-resumen">{diag.resumen}</p>}
        </div>
        {diag && diag.cobertura_global !== null && (
          <div className="an-metricas">
            <div className="an-metrica"><b>{diag.factores_desfavorables}</b><span>factores desfavorables</span></div>
            <div className="an-metrica"><b>{Math.round(diag.cobertura_global * 100)} %</b><span>respuestas conocidas</span></div>
            <div className="an-metrica"><b>{datos.det?.total_determinantes ?? '—'}</b><span>respuestas que deciden</span></div>
          </div>
        )}
      </header>

      {cargando && <p className="an-vacio an-cuerpo">Analizando…</p>}
      {error && <div className="error-msg" style={{ margin: 16 }}>{error}</div>}

      {datos && (
        <>
          <nav className="an-pestanas" role="tablist" aria-label="Apartados del análisis">
            {visibles.map(({ id, etiqueta, tono, Icono }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activa === id}
                className={`an-pestana an-pestana-${tono}${activa === id ? ' activa' : ''}`}
                onClick={() => setPestana(id)}
              >
                <Icono />
                {etiqueta}
                {cuentas[id] > 0 && <span className="an-pestana-cuenta">{cuentas[id]}</span>}
              </button>
            ))}
          </nav>
          <div className="an-panel" role="tabpanel">
            {activa === 'causas' && <Causas diag={diag} />}
            {activa === 'mejora' && <Mejora plan={datos.plan} />}
            {activa === 'sensibilidad' && <Sensibilidad det={datos.det} />}
            {activa === 'avisos' && <Avisos diag={diag} />}
            {activa === 'informe' && <Informe evaluacionId={evaluacionId} />}
          </div>
        </>
      )}
    </div>
  )
}
