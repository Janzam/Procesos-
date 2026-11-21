// Sub-apartado de Literatura IA: la tabla de resultados de una corrida, siempre
// a mano. Abre la última corrida consultada; si no hay, la aplicada al catálogo;
// si tampoco, la última terminada. Un selector permite cambiar de corrida.
import { useEffect, useState } from 'react'
import { getCorridas, getCorrida } from '../api/guiosad.js'
import ResultadosLiteratura from '../components/ResultadosLiteratura.jsx'
import { IcoTabla, IcoBuscar, IcoCheck } from '../components/Iconos.jsx'

export const CORRIDA_KEY = 'guiosad-lit-corrida'

export function recordarCorrida(id) {
  try { localStorage.setItem(CORRIDA_KEY, String(id)) } catch { /* modo privado */ }
}

function corridaRecordada() {
  try { return Number(localStorage.getItem(CORRIDA_KEY)) || null } catch { return null }
}

export default function LiteraturaTablaPage({ onNavigate }) {
  const [corridas, setCorridas] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    getCorridas().then(lista => {
      const listas = lista.filter(c => c.estado === 'listo')
      setCorridas(listas)
      const recordada = corridaRecordada()
      const elegida = listas.find(c => c.id === recordada) || listas.find(c => c.activada) || listas[0]
      if (elegida) abrir(elegida.id)
    }).catch(e => setError(e.message))
  }, [])

  async function abrir(id) {
    setCargando(true)
    setError('')
    try {
      setDetalle(await getCorrida(id))
      recordarCorrida(id)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  function actualizado(corrida) {
    setDetalle(corrida)
    setCorridas(prev => prev?.map(c => {
      if (c.id === corrida.id) return { ...c, activada: corrida.activada }
      return corrida.activada ? { ...c, activada: false } : c
    }))
  }

  return (
    <div className="lit-page">
      <section className="litt-cabecera">
        <span className="litt-icono"><IcoTabla /></span>
        <div className="litt-texto">
          <span className="litr-eyebrow">Literatura IA</span>
          <h1>Tabla de resultados</h1>
          <p>TC, NS, r, IL e IS de los 18 factores, comparados con la Tabla 5.3 de la tesis.</p>
        </div>
        <div className="litt-selector">
          <label htmlFor="litt-corrida">Corrida</label>
          <select id="litt-corrida" value={detalle?.id || ''} disabled={!corridas?.length}
                  onChange={e => abrir(Number(e.target.value))}>
            {!corridas?.length && <option value="">Sin corridas terminadas</option>}
            {corridas?.map(c => (
              <option key={c.id} value={c.id}>
                #{c.id} · {c.nombre} · {c.rango}{c.activada ? ' · aplicada' : ''}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && <div className="lit-error">{error}</div>}

      {corridas && !corridas.length && (
        <div className="lit-panel lit-vacio-estado">
          <span className="lit-vacio-icono"><IcoBuscar /></span>
          <b>Aún no hay corridas terminadas</b>
          <p>Lanza un análisis en Literatura IA y su tabla aparecerá aquí.</p>
          <button type="button" className="litr-boton litr-boton-aplicar" onClick={() => onNavigate?.('literatura')}>
            <IcoCheck /> Ir a Literatura IA
          </button>
        </div>
      )}

      {cargando && !detalle && <p className="lit-vacio">Cargando resultados…</p>}
      <ResultadosLiteratura detalle={detalle} onActualizado={actualizado} />
    </div>
  )
}
