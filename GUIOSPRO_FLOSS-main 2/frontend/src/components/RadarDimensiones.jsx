// origen: nuevo | cambio: visualización radar de las 3 dimensiones, no existía en el sistema original
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts'

const DIMENSIONES = ['Tecnológica', 'Organizacional', 'Económica']

export default function RadarDimensiones({ factores }) {
  const data = DIMENSIONES.map((dim) => {
    const dimFactores = factores.filter((f) => f.dimension === dim && f.ponderacion_global !== null)
    const avg = dimFactores.length
      ? dimFactores.reduce((s, f) => s + f.ponderacion_global, 0) / dimFactores.length
      : 0
    return { dimension: dim, ponderacion: parseFloat(avg.toFixed(2)) }
  })

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px #0001' }}>
      <h3 style={{ marginBottom: 12, fontSize: 15 }}>Radar por Dimensión</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 10 }} />
          <Radar dataKey="ponderacion" stroke="#4f8ef7" fill="#4f8ef7" fillOpacity={0.5} />
          <Tooltip formatter={(v) => [`${v} / 4`, 'Ponderación media']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
