// origen: nuevo | panel resumido con lo esencial de todas las evaluaciones (GET /api/evaluaciones/dashboard/)
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { getDashboard } from '../api/guiosad.js'

const REC_INFO = {
  A: { label: 'A · Adoptar',              color: 'var(--green)' },
  B: { label: 'B · Adoptar con reservas', color: 'var(--amber)' },
  C: { label: 'C · No adoptar todavía',   color: 'var(--red)' },
}

const TOOLTIP_STYLE = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' },
  itemStyle: { color: 'var(--text-primary)' },
  labelStyle: { color: 'var(--text-primary)', fontWeight: 600 },
  cursor: { fill: 'var(--bg-hover)' },
}
const TICK = { fontSize: 11.5, fill: 'var(--text-secondary)' }

function KpiTile({ label, value, sub, accent }) {
  return (
    <div className="card kpi-tile">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, height = 200 }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      <div style={{ marginTop: 12 }}>
        <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
      </div>
    </div>
  )
}

// Barras horizontales: una categoría por fila, nombre en el eje y valor al final.
// `width`/`height` los inyecta ResponsiveContainer y deben llegar al BarChart.
function BarrasHorizontales({ data, colorDe, ancho = 120, width, height }) {
  return (
    <BarChart width={width} height={height} data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
      <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
      <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
      <YAxis type="category" dataKey="label" width={ancho} tick={TICK} axisLine={false} tickLine={false} />
      <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, 'Evaluaciones']} />
      <Bar dataKey="value" barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={false}>
        {data.map((d, i) => <Cell key={i} fill={colorDe(d, i)} />)}
        <LabelList dataKey="value" position="right" style={{ fontSize: 11.5, fontWeight: 600, fill: 'var(--text-primary)' }} />
      </Bar>
    </BarChart>
  )
}

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError('No se pudo cargar el dashboard. Verifique que el backend esté en ejecución.'))
  }, [])

  if (error) return <div className="error-msg">{error}</div>
  if (!data) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando métricas…</p>

  const total = data.total_evaluaciones
  if (total === 0) {
    return (
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen de las evaluaciones realizadas.</p>
        <div className="empty-state card" style={{ minHeight: 280 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 3v18h18M7 14l4-4 4 4 5-6"/></svg>
          <p>Todavía no hay evaluaciones. Cree la primera para ver métricas aquí.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('evaluacion')}>Nueva evaluación</button>
        </div>
      </div>
    )
  }

  const rec = data.recomendaciones
  const pctA = Math.round((rec.A / total) * 100)
  const recData  = ['A', 'B', 'C'].map(k => ({ key: k, label: REC_INFO[k].label, value: rec[k] }))
  const probData = data.problemas_frecuentes.slice(0, 5).map(p => ({ label: p.factor_nombre, value: p.veces }))

  // Foco de atención: balance FODA y factor más problemático
  const fodaTotal = Object.values(data.foda).reduce((s, v) => s + v, 0)
  const negativos = (data.foda.Debilidad || 0) + (data.foda.Amenaza || 0)
  const pctNeg = fodaTotal ? Math.round((negativos / fodaTotal) * 100) : 0
  const topProblema = data.problemas_frecuentes[0]
  const dimDebil = [...data.ponderacion_por_dimension].sort((a, b) => a.ponderacion - b.ponderacion)[0]
  const nivel = pctNeg >= 60 ? 'c' : pctNeg >= 30 ? 'b' : 'a'
  const titularFoco = {
    c: `El ${pctNeg}% de los factores evaluados son Debilidades o Amenazas`,
    b: `Situación intermedia: ${pctNeg}% de factores en Debilidad o Amenaza`,
    a: `Buen panorama: solo el ${pctNeg}% de factores en Debilidad o Amenaza`,
  }[nivel]
  const pond = data.ponderacion_promedio

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Resumen de las evaluaciones realizadas.</p>

      {/* Foco de atención */}
      <div className={`rec-banner rec-banner-${nivel} foco-banner`}>
        <div className={`rec-badge-circle rec-badge-${nivel}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            {nivel === 'a'
              ? <path d="M20 6L9 17l-5-5"/>
              : <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>}
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="rec-title" style={{ fontSize: 18 }}>{titularFoco}</div>
          <div className="foco-chips">
            {topProblema && (
              <span className="foco-chip">
                <strong>Factor a vigilar:</strong> {topProblema.factor_nombre} — problemático en {topProblema.veces} de {total} evaluaciones
              </span>
            )}
            {dimDebil && (
              <span className="foco-chip">
                <strong>Dimensión más débil:</strong> {dimDebil.dimension} ({dimDebil.ponderacion.toFixed(2)} / 4)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid kpi-grid-3">
        <KpiTile label="Evaluaciones" value={total} sub="guardadas en la base de datos" />
        <KpiTile label="Recomendación A (adoptar)" value={`${pctA}%`} sub={`${rec.A} de ${total} evaluaciones`} accent="var(--green)" />
        <KpiTile
          label="Ponderación media"
          value={pond !== null ? `${pond} / 4` : '—'}
          sub="cumplimiento de subfactores"
          accent={pond !== null ? (pond >= 3 ? 'var(--green)' : pond >= 2 ? 'var(--amber)' : 'var(--red)') : undefined}
        />
      </div>

      {/* Gráficos */}
      <div className="dash-grid-2">
        <ChartCard title="Veredictos" subtitle="Evaluaciones por recomendación final" height={150}>
          <BarrasHorizontales data={recData} colorDe={d => REC_INFO[d.key].color} ancho={170} />
        </ChartCard>
        <ChartCard title="Factores a mejorar" subtitle="Veces clasificados como Debilidad o Amenaza (top 5)" height={Math.max(150, probData.length * 30 + 30)}>
          <BarrasHorizontales data={probData} colorDe={() => 'var(--teal)'} ancho={190} />
        </ChartCard>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-xs" onClick={() => onNavigate('historial')}>Ver historial completo →</button>
      </div>
    </div>
  )
}
