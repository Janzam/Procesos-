// origen: nuevo | cambio: diagrama FODA tipo "flor" de 4 pétalos (F D / O A) con los factores evaluados
const PETALOS = [
  { cat: 'Fortaleza',   label: 'Fortalezas',    cls: 'foda-petal-f' },
  { cat: 'Debilidad',   label: 'Debilidades',   cls: 'foda-petal-d' },
  { cat: 'Oportunidad', label: 'Oportunidades', cls: 'foda-petal-o' },
  { cat: 'Amenaza',     label: 'Amenazas',      cls: 'foda-petal-a' },
]

export default function FodaFlower({ factores }) {
  const groups = {}
  PETALOS.forEach(p => { groups[p.cat] = factores.filter(f => f.foda_categoria === p.cat) })

  const hasAny = PETALOS.some(p => groups[p.cat].length > 0)
  if (!hasAny) return null

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>
        Diagrama FODA
      </div>
      <div className="foda-flower">
        {PETALOS.map(p => {
          const items = groups[p.cat]
          return (
            <div key={p.cat} className={`foda-petal ${p.cls}`}>
              <div className="foda-petal-head">
                <span className="foda-petal-title">{p.label}</span>
                <span className="foda-petal-count">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="foda-petal-empty">Ninguno</p>
              ) : (
                <ul className="foda-petal-list">
                  {items.map(f => (
                    <li key={f.factor_id}>{f.factor_nombre}</li>
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
