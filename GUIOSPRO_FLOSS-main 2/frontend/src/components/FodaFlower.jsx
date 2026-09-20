// origen: nuevo | cambio: visualización gráfica de resultados FODA, no existía en el sistema original
export default function FodaFlower({ factores }) {
  const evaluados = factores.filter((f) => f.foda_categoria)
  if (evaluados.length === 0) return null

  const cx = 200, cy = 200, r = 130
  const N = evaluados.length
  const COLOR = { Fortaleza: '#2ecc71', Oportunidad: '#4f8ef7', Debilidad: '#e74c3c', Amenaza: '#e67e22' }

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px #0001' }}>
      <h3 style={{ marginBottom: 12, fontSize: 15 }}>Diagrama FODA</h3>
      <svg width={400} height={400} viewBox="0 0 400 400">
        {evaluados.map((f, i) => {
          const angle = (2 * Math.PI * i) / N - Math.PI / 2
          const petalR = 55
          const px = cx + r * Math.cos(angle)
          const py = cy + r * Math.sin(angle)
          const color = COLOR[f.foda_categoria] || '#ccc'
          const lx = cx + (r + 70) * Math.cos(angle)
          const ly = cy + (r + 70) * Math.sin(angle)
          return (
            <g key={f.factor_id}>
              <ellipse
                cx={px} cy={py} rx={petalR} ry={petalR * 0.55}
                transform={`rotate(${(angle * 180) / Math.PI + 90}, ${px}, ${py})`}
                fill={color} opacity={0.85}
              />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fill="#333" style={{ userSelect: 'none' }}>
                {f.factor_nombre.length > 18 ? f.factor_nombre.slice(0, 16) + '…' : f.factor_nombre}
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={28} fill="#1a1a2e" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={10} fontWeight={700}>FODA</text>
      </svg>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        {Object.entries(COLOR).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: v, display: 'inline-block' }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}
