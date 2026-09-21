// origen: main.py (Tab 3) | cambio: banner de recomendación + tabla FODA moderna + mini-barras
import FodaFlower from '../FodaFlower.jsx'
import RadarDimensiones from '../RadarDimensiones.jsx'

const FODA_CLASS = {
  Fortaleza:   'badge-foda-fortaleza',
  Oportunidad: 'badge-foda-oportunidad',
  Debilidad:   'badge-foda-debilidad',
  Amenaza:     'badge-foda-amenaza',
}
const REC_LABEL = { A: 'Adoptar el software', B: 'Adoptar con reservas', C: 'No adoptar todavía' }
const REC_CLASS = { A: 'rec-banner-a', B: 'rec-banner-b', C: 'rec-banner-c' }
const REC_BADGE = { A: 'rec-badge-a', B: 'rec-badge-b', C: 'rec-badge-c' }

function MiniBar({ val, max = 4 }) {
  const pct = Math.round((val / max) * 100)
  const good = val >= 2.5
  return (
    <div className="mini-bar-wrap">
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 30 }}>{val.toFixed(2)}</span>
      <div className="mini-bar-track">
        <div className={`mini-bar-fill ${good ? 'mini-bar-good' : 'mini-bar-bad'}`} style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

export default function StepResultados({ resultado }) {
  if (!resultado) return <p style={{ color: 'var(--text-muted)' }}>Calculando resultado...</p>
  const { factores, recomendacion } = resultado
  const cod = recomendacion.codigo

  return (
    <div>
      {/* Banner de recomendación */}
      <div className={`rec-banner ${REC_CLASS[cod] || ''}`}>
        <div className={`rec-badge-circle ${REC_BADGE[cod] || ''}`}>{cod || '?'}</div>
        <div>
          <div className="rec-title">
            Recomendación {cod} — {REC_LABEL[cod] || 'Resultado'}
          </div>
          <div className="rec-text">{recomendacion.texto}</div>
        </div>
      </div>

      {/* Grid resultados */}
      <div className="results-grid">
        {/* Tabla FODA */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-glass)' }}>
            <span className="card-header-title">Clasificación FODA por factor</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="foda-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Dimensión</th>
                  <th>Imp. Relativa</th>
                  <th>Ponderación</th>
                  <th>FODA</th>
                </tr>
              </thead>
              <tbody>
                {factores.map(f => (
                  <tr key={f.factor_id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12.5 }}>{f.factor_nombre}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.dimension}</td>
                    <td>
                      <span className={`badge badge-ir-${f.ir_etiqueta?.toLowerCase() || 'irrelevante'}`}>
                        {f.ir_etiqueta || '—'}
                      </span>
                    </td>
                    <td>
                      {f.ponderacion_global !== null
                        ? <MiniBar val={f.ponderacion_global} />
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      {f.foda_categoria
                        ? <span className={`badge ${FODA_CLASS[f.foda_categoria] || ''}`}>{f.foda_categoria}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visualizaciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FodaFlower factores={factores} />
          <RadarDimensiones factores={factores} />
        </div>
      </div>

      <div className="results-footer">
        <button className="btn btn-outline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          Exportar PDF
        </button>
        <button className="btn btn-outline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Exportar Excel
        </button>
      </div>
    </div>
  )
}
