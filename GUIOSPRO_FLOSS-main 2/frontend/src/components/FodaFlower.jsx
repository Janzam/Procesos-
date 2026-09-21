// origen: nuevo | cambio: FodaFlower con tema oscuro, pétalos SVG coloreados
export default function FodaFlower({ factores }) {
  const evaluados = factores.filter(f => f.foda_categoria)
  if (evaluados.length === 0) return null

  const cx = 160, cy = 160, r = 100
  const N = evaluados.length
  const COLOR = { Fortaleza: '#10b981', Oportunidad: '#60a5fa', Debilidad: '#ef4444', Amenaza: '#f59e0b' }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>Diagrama FODA</div>
      <svg width="100%" viewBox="0 0 320 320" style={{ display: 'block' }}>
        {/* bg circle */}
        <circle cx={cx} cy={cy} r={r + 60} fill="rgba(255,255,255,0.02)" />
        {evaluados.map((f, i) => {
          const angle = (2 * Math.PI * i) / N - Math.PI / 2
          const px = cx + r * Math.cos(angle)
          const py = cy + r * Math.sin(angle)
          const color = COLOR[f.foda_categoria] || '#94a3b8'
          const lx = cx + (r + 68) * Math.cos(angle)
          const ly = cy + (r + 68) * Math.sin(angle)
          return (
            <g key={f.factor_id}>
              <ellipse
                cx={px} cy={py} rx={46} ry={26}
                transform={`rotate(${(angle * 180) / Math.PI + 90}, ${px}, ${py})`}
                fill={color} opacity={0.8}
              />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fill="#94a3b8" style={{ userSelect: 'none' }}>
                {f.factor_nombre.length > 16 ? f.factor_nombre.slice(0, 14) + '…' : f.factor_nombre}
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={24} fill="#0f172a" stroke="var(--border-glass)" strokeWidth={1} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill="var(--teal)" fontSize={9} fontWeight={700}>FODA</text>
      </svg>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        {Object.entries(COLOR).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: v, display: 'inline-block' }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  )
}
