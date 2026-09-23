// origen: nuevo | cambio: RadarDimensiones con tema oscuro y colores teal
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts'

const DIMENSIONES = ['Tecnológica', 'Organizacional', 'Económica']

export default function RadarDimensiones({ factores }) {
  const data = DIMENSIONES.map(dim => {
    const df = factores.filter(f => f.dimension === dim && f.ponderacion_global !== null)
    const avg = df.length ? df.reduce((s, f) => s + f.ponderacion_global, 0) / df.length : 0
    return { dimension: dim, ponderacion: parseFloat(avg.toFixed(2)) }
  })

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>Radar por Dimensión</div>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} outerRadius="78%" style={{ fontFamily: 'Inter, sans-serif' }}>
          <PolarGrid stroke="var(--chart-grid)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 500 }} />
          <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Radar dataKey="ponderacion" stroke="var(--brand)" strokeWidth={2} fill="var(--brand)" fillOpacity={0.3}
            dot={{ fill: 'var(--brand)', r: 4, strokeWidth: 0 }} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            formatter={v => [`${v} / 4`, 'Ponderación media']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
