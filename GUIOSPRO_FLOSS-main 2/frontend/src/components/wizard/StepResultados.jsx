// origen: main.py (Tab 3) | cambio: banner de recomendación + tabla FODA moderna + mini-barras
import { useState, useEffect } from 'react'
import FodaFlower from '../FodaFlower.jsx'
import RadarDimensiones from '../RadarDimensiones.jsx'

// Las librerías de exportación (jsPDF, ExcelJS) pesan ~700 KB y se cargan aparte
// del arranque. Se precargan al entrar en Resultados: si el navegador tuviera que
// descargarlas durante el clic, perdería la activación transitoria del gesto y
// bloquearía el archivo por considerar que la descarga no la pidió el usuario.
let moduloExportar = null
function precargarExportacion() {
  moduloExportar = moduloExportar || import('../../utils/exportar.js')
  return moduloExportar
}

async function exportar(tipo, nombre, resultado) {
  const mod = await precargarExportacion()
  if (tipo === 'pdf') mod.exportarPDF(nombre, resultado)
  else await mod.exportarExcel(nombre, resultado)
}

// Preferencia de mostrar/ocultar el panel de gráficos (se recuerda entre sesiones)
const GRAFICOS_KEY = 'guiosad-mostrar-graficos'
function leerMostrarGraficos() {
  try { return localStorage.getItem(GRAFICOS_KEY) !== 'no' } catch { return true }
}

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

export default function StepResultados({ resultado, nombre }) {
  const [mostrarGraficos, setMostrarGraficos] = useState(leerMostrarGraficos)
  useEffect(() => {
    try { localStorage.setItem(GRAFICOS_KEY, mostrarGraficos ? 'si' : 'no') } catch { /* ignorar */ }
  }, [mostrarGraficos])

  // Se empieza a traer el módulo de exportación en cuanto se ven los resultados
  useEffect(() => { precargarExportacion() }, [])

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
      <div className={`results-grid${mostrarGraficos ? '' : ' results-grid-solo-tabla'}`}>
        {/* Tabla FODA */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-glass)', justifyContent: 'space-between' }}>
            <span className="card-header-title" style={{ color: 'var(--text-primary)' }}>Clasificación FODA por factor</span>
            <button
              className="btn btn-outline btn-xs"
              onClick={() => setMostrarGraficos(v => !v)}
              title={mostrarGraficos ? 'Ocultar el panel de gráficos para ver la tabla completa' : 'Mostrar diagrama FODA y radar'}
            >
              {mostrarGraficos ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
              {mostrarGraficos ? 'Ocultar gráficos' : 'Mostrar gráficos'}
            </button>
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
        {mostrarGraficos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FodaFlower factores={factores} />
            <RadarDimensiones factores={factores} />
          </div>
        )}
      </div>

      <div className="results-footer">
        <button className="btn btn-outline" onClick={() => exportar('pdf', nombre, resultado)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          Exportar PDF
        </button>
        <button className="btn btn-outline" onClick={() => exportar('excel', nombre, resultado)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Exportar Excel
        </button>
      </div>
    </div>
  )
}
