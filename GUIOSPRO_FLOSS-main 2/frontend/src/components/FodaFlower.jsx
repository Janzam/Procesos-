// origen: nuevo | cambio: cuadrante FODA 2x2 con listas de factores por categoría
const FODA_CATS = ['Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza']
const FODA_CONFIG = {
  Fortaleza:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  icon: '💪', label: 'Fortalezas' },
  Oportunidad: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  icon: '🚀', label: 'Oportunidades' },
  Debilidad:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   icon: '⚠️', label: 'Debilidades' },
  Amenaza:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  icon: '🛡️', label: 'Amenazas' },
}

export default function FodaFlower({ factores }) {
  const groups = {}
  FODA_CATS.forEach(c => { groups[c] = factores.filter(f => f.foda_categoria === c) })

  const hasAny = FODA_CATS.some(c => groups[c].length > 0)
  if (!hasAny) return null

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>
        Diagrama FODA
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {FODA_CATS.map(cat => {
          const cfg = FODA_CONFIG[cat]
          const items = groups[cat]
          return (
            <div key={cat} style={{
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 8, padding: '10px 12px', minHeight: 80,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {cfg.label}
                </span>
                <span style={{
                  marginLeft: 'auto', background: cfg.color, color: '#fff',
                  borderRadius: 99, fontSize: 10, fontWeight: 700,
                  padding: '0 6px', lineHeight: '16px',
                }}>
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>Ninguno</p>
              ) : (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {items.map(f => (
                    <li key={f.factor_id} style={{
                      fontSize: 10.5, color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'flex-start', gap: 4,
                    }}>
                      <span style={{ color: cfg.color, marginTop: 1 }}>•</span>
                      <span style={{ lineHeight: 1.4 }}>{f.factor_nombre}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
