// Panel resumido de todas las evaluaciones (GET /api/evaluaciones/dashboard/)
//
// Los gráficos son HTML y CSS, no una librería: son tres formas sencillas —una
// barra apilada, unas barras de comparación y unos medidores— y así cada valor
// lleva su etiqueta visible, sin depender de un tooltip para poder leerse.
import { useState, useEffect } from 'react'
import { getDashboard } from '../api/guiosad.js'
import { REC_V } from '../utils/recomendacion.js'

const REC_CORTO = { A: 'Adoptar', B: 'Adoptar con reservas', C: 'No adoptar todavía' }
const ORDEN = ['A', 'B', 'C']

const DIM_CLASE = { 'Tecnológica': 'dim-tec', 'Organizacional': 'dim-org', 'Económica': 'dim-eco' }

function pct(parte, total) {
  return total ? Math.round((parte / total) * 100) : 0
}

// ── Cifra destacada ─────────────────────────────────────────────────
function Kpi({ etiqueta, valor, pie, tono }) {
  return (
    <div className={`kpi${tono ? ` kpi-${tono}` : ''}`}>
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor">{valor}</div>
      {pie && <div className="kpi-pie">{pie}</div>}
    </div>
  )
}

// ── Reparto de veredictos: una sola barra de 100 % ──────────────────
// Parte-de-un-todo con tres clases ordenadas. Cada segmento lleva su cifra y
// hay leyenda, de modo que el color nunca es el único portador del dato.
function Veredictos({ rec, total }) {
  const visibles = ORDEN.filter(k => rec[k] > 0)
  return (
    <section className="panel">
      <header className="panel-cab">
        <h3 className="panel-titulo">Reparto de veredictos</h3>
        <span className="panel-apunte">{total} evaluaciones</span>
      </header>

      <div className="apilada" role="img"
           aria-label={ORDEN.map(k => `${REC_CORTO[k]}: ${rec[k]}`).join('. ')}>
        {visibles.map(k => (
          <div
            key={k}
            className={`apilada-seg ${REC_V[k]}`}
            style={{ flexGrow: rec[k] }}
            title={`${REC_CORTO[k]}: ${rec[k]} de ${total}`}
          >
            <span className="apilada-cifra">{pct(rec[k], total)} %</span>
          </div>
        ))}
      </div>

      <ul className="leyenda">
        {ORDEN.map(k => (
          <li key={k} className={rec[k] ? '' : 'leyenda-cero'}>
            <span className={`leyenda-punto ${REC_V[k]}`} aria-hidden="true" />
            <span className="leyenda-letra">{k}</span>
            <span className="leyenda-texto">{REC_CORTO[k]}</span>
            <span className="leyenda-valor">{rec[k]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Factores problemáticos: énfasis en el primero ───────────────────
// Son categorías sin orden natural, así que no se tiñen por magnitud —eso
// duplicaría en color lo que la longitud ya dice—. Se resalta el primero,
// que es el que la cabecera señala, y el resto queda en gris de contexto.
function Problematicos({ datos, total }) {
  if (!datos.length) return null
  const max = Math.max(...datos.map(d => d.veces))
  return (
    <section className="panel">
      <header className="panel-cab">
        <h3 className="panel-titulo">Factores que más fallan</h3>
        <span className="panel-apunte">veces clasificados como Debilidad o Amenaza</span>
      </header>
      <ul className="barras">
        {datos.map((d, i) => (
          <li key={d.factor_id ?? d.factor_nombre} className={i === 0 ? 'barra-foco' : ''}>
            <span className="barra-nombre" title={d.factor_nombre}>{d.factor_nombre}</span>
            <span className="barra-pista">
              <span className="barra-fill" style={{ width: `${(d.veces / max) * 100}%` }} />
            </span>
            <span className="barra-valor">{d.veces}<small>/{total}</small></span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Ponderación por dimensión: un medidor por dimensión ─────────────
function Dimensiones({ datos }) {
  if (!datos.length) return null
  return (
    <section className="panel">
      <header className="panel-cab">
        <h3 className="panel-titulo">Cumplimiento por dimensión</h3>
        <span className="panel-apunte">ponderación media sobre 4 · umbral 3,0</span>
      </header>
      <ul className="medidores">
        {datos.map(d => {
          const p = (d.ponderacion / 4) * 100
          return (
            <li key={d.dimension} className={DIM_CLASE[d.dimension] || 'dim-tec'}>
              <div className="medidor-cab">
                <span className="medidor-nombre">
                  <span className="medidor-punto" aria-hidden="true" />{d.dimension}
                </span>
                <span className={`medidor-valor${d.ponderacion >= 3 ? ' medidor-ok' : ' medidor-bajo'}`}>
                  {d.ponderacion.toFixed(2)}
                </span>
              </div>
              <div className="medidor-pista">
                <span className="medidor-fill" style={{ width: `${p}%` }} />
                <span className="medidor-umbral" style={{ left: '75%' }} aria-hidden="true" />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="panel-nota">La marca vertical señala el umbral de 3,0 a partir del cual un factor resulta favorable.</p>
    </section>
  )
}

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('No se pudo cargar el dashboard. Verifique que el backend esté en ejecución.'))
  }, [])

  if (error) return <div className="error-msg">{error}</div>
  if (!data) return <p className="an-vacio">Cargando métricas…</p>

  const total = data.total_evaluaciones
  if (total === 0) {
    return (
      <div>
        <h1 className="page-title">Panel</h1>
        <p className="page-subtitle">Resumen de las evaluaciones realizadas.</p>
        <div className="empty-state card" style={{ minHeight: 280 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3 3v18h18M7 14l4-4 4 4 5-6"/>
          </svg>
          <p>Todavía no hay evaluaciones. Cree la primera para ver métricas aquí.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('evaluacion')}>
            Nueva evaluación
          </button>
        </div>
      </div>
    )
  }

  const rec = data.recomendaciones
  const pond = data.ponderacion_promedio

  // El titular lo manda el reparto de veredictos, que es lo que el decisor
  // obtiene. Antes lo mandaba el porcentaje de factores desfavorables, y eso
  // producía titulares contradictorios: «buen panorama» con el 100 % de las
  // evaluaciones en C, porque basta UN factor importante desfavorable para que
  // la metodología emita esa recomendación.
  const nivel = pct(rec.C, total) >= 50 ? 'c' : pct(rec.A, total) >= 50 ? 'a' : 'b'
  const titular = {
    c: `${rec.C} de ${total} evaluaciones terminan en «No adoptar todavía»`,
    b: `La mayoría de las evaluaciones quedan en «Adoptar con reservas»`,
    a: `${rec.A} de ${total} evaluaciones recomiendan adoptar`,
  }[nivel]

  const fodaTotal = Object.values(data.foda).reduce((s, v) => s + v, 0)
  const negativos = (data.foda.Debilidad || 0) + (data.foda.Amenaza || 0)
  const pctNeg = pct(negativos, fodaTotal)
  const topProblema = data.problemas_frecuentes[0]
  const dimDebil = [...data.ponderacion_por_dimension].sort((a, b) => a.ponderacion - b.ponderacion)[0]

  return (
    <div className="dash">
      <header className="dash-cab">
        <div>
          <h1 className="page-title">Panel</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Resumen de las {total} evaluaciones guardadas.
          </p>
        </div>
        <button className="btn btn-outline btn-xs" onClick={() => onNavigate('historial')}>
          Ver historial
        </button>
      </header>

      {/* Titular */}
      <section className={`titular titular-${nivel}`}>
        <div className="titular-marca" aria-hidden="true">
          {nivel.toUpperCase()}
        </div>
        <div className="titular-cuerpo">
          <h2 className="titular-texto">{titular}</h2>
          <p className="titular-lectura">
            Solo el <strong>{pctNeg} %</strong> de los factores evaluados resultan Debilidad o Amenaza,
            pero basta uno de ellos en un factor importante para que la metodología emita una C.
          </p>
          <div className="titular-chips">
            {topProblema && (
              <span className="titular-chip">
                Factor a vigilar <b>{topProblema.factor_nombre}</b> · {topProblema.veces} de {total}
              </span>
            )}
            {dimDebil && (
              <span className="titular-chip">
                Dimensión más débil <b>{dimDebil.dimension}</b> · {dimDebil.ponderacion.toFixed(2)} / 4
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Cifras */}
      <div className="kpi-fila">
        <Kpi etiqueta="Evaluaciones" valor={total} pie="guardadas en la base de datos" />
        <Kpi
          etiqueta="Recomiendan adoptar"
          valor={`${pct(rec.A, total)} %`}
          pie={`${rec.A} de ${total}`}
          tono={rec.A ? 'ok' : 'cero'}
        />
        <Kpi
          etiqueta="Ponderación media"
          valor={pond !== null ? pond.toFixed(2) : '—'}
          pie="sobre 4 · umbral 3,0"
          tono={pond === null ? undefined : pond >= 3 ? 'ok' : 'bajo'}
        />
        <Kpi
          etiqueta="Factores relevantes"
          valor={data.factores_relevantes_promedio}
          pie="de media por evaluación"
        />
      </div>

      <Veredictos rec={rec} total={total} />

      <div className="dash-dos">
        <Problematicos datos={data.problemas_frecuentes.slice(0, 5)} total={total} />
        <Dimensiones datos={data.ponderacion_por_dimension} />
      </div>
    </div>
  )
}
