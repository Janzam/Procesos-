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
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} style={{ fontFamily: 'Inter, sans-serif' }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 9, fill: '#475569' }} />
          <Radar dataKey="ponderacion" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25}
            dot={{ fill: '#14b8a6', r: 3 }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#f1f5f9' }}
            formatter={v => [`${v} / 4`, 'Ponderación media']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
