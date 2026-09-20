// origen: main.py (Tab 3, compute_recommendation, clasificar_foda) | cambio: ninguno en lógica, UI migrada a React
import FodaFlower from '../FodaFlower.jsx'
import RadarDimensiones from '../RadarDimensiones.jsx'

const COLOR_MAP = { good: '#2ecc71', bad: '#e74c3c', neutro: '#f0c040' }
const BG_MAP = { good: '#d5f5e3', bad: '#fde8e8', neutro: '#fef9e7' }

export default function StepResultados({ resultado }) {
  if (!resultado) return <p>Calculando resultado...</p>

  const { factores, recomendacion } = resultado

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <FodaFlower factores={factores} />
        <RadarDimensiones factores={factores} />
      </div>

      <div>
        <h3 style={{ marginBottom: 12 }}>Clasificación FODA por factor</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                <th style={th}>Factor</th>
                <th style={th}>Dimensión</th>
                <th style={th}>Imp. Relativa</th>
                <th style={th}>Ponderación</th>
                <th style={th}>Alcance</th>
                <th style={th}>FODA</th>
              </tr>
            </thead>
            <tbody>
              {factores.map((f) => (
                <tr key={f.factor_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{f.factor_nombre}</td>
                  <td style={td}>{f.dimension}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{f.ir_etiqueta}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {f.ponderacion_global !== null ? f.ponderacion_global.toFixed(2) : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>{f.alcance || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {f.foda_categoria ? (
                      <span style={{
                        background: COLOR_MAP[f.foda_color] || '#ccc',
                        color: '#fff', padding: '2px 10px', borderRadius: 12,
                        fontWeight: 600, fontSize: 12,
                      }}>
                        {f.foda_categoria}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        background: BG_MAP[recomendacion.color] || '#f5f5f5',
        border: `2px solid ${COLOR_MAP[recomendacion.color] || '#ccc'}`,
        borderRadius: 10, padding: 20,
      }}>
        <h3 style={{ color: COLOR_MAP[recomendacion.color], marginBottom: 8 }}>
          {recomendacion.codigo ? `Recomendación ${recomendacion.codigo}` : 'Sin datos suficientes'}
        </h3>
        <p style={{ lineHeight: 1.6 }}>{recomendacion.texto}</p>
      </div>
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600 }
const td = { padding: '8px 12px' }
