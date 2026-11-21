// origen: nuevo | cambio: RadarDimensiones con tema oscuro y colores teal
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts'

const DIMENSIONES = ['Tecnológica', 'Organizacional', 'Económica']

export default function RadarDimensiones({ factores }) {
  // Solo las dimensiones con factores ponderados: una dimensión que quedó fuera del
  // cálculo (por ejemplo, vacía en una plantilla importada) no se dibuja en 0, que
  // se leería como la peor nota cuando en realidad no se evaluó.
  const data = DIMENSIONES.map(dim => {
    const df = factores.filter(f => f.dimension === dim && f.ponderacion_global !== null)
    if (!df.length) return null
    const avg = df.reduce((s, f) => s + f.ponderacion_global, 0) / df.length
    return { dimension: dim, ponderacion: parseFloat(avg.toFixed(2)) }
  }).filter(Boolean)

  // Un radar necesita al menos tres ejes: con menos se dibuja como una línea. En
  // ese caso se muestran barras con la misma información.
  if (data.length < 3) {
    const fuera = DIMENSIONES.filter(d => !data.some(x => x.dimension === d))
    return (
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>Ponderación por dimensión</div>
        {data.map(d => (
          <div key={d.dimension} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{d.dimension}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{d.ponderacion} / 4</span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--track)' }}>
              <div style={{ width: `${(d.ponderacion / 4) * 100}%`, height: '100%', borderRadius: 6, background: 'var(--brand)' }} />
            </div>
          </div>
        ))}
        {fuera.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Sin datos en esta evaluación: {fuera.join(', ')}. El radar se muestra cuando hay al menos tres dimensiones evaluadas.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>Radar por Dimensión</div>
      <ResponsiveContainer width="100%" height={320}>
        {/* margen lateral: sin él, «Organizacional» se sale del SVG y aparece cortada (DEF-09) */}
        <RadarChart data={data} outerRadius="72%" margin={{ top: 10, right: 44, bottom: 10, left: 44 }}
          style={{ fontFamily: 'Inter, sans-serif' }}>
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
