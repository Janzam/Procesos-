// Resultados de una corrida de literatura (sub-apartado «Tabla de resultados»):
// un resumen con fichas al estilo del Panel y, debajo, la tabla de los factores
// en tres pestañas, una por dimensión (TC, NS, r, IL, IS y su diferencia con la
// Tabla 5.3), con los artículos que sustentan cada factor y las acciones de
// aplicar o revertir la IS en el catálogo.
//
// Aplicar la IS al catálogo cambia la importancia sugerida de los factores. El
// motor calcula cada evaluación en el momento de mostrarla, así que el cambio se
// refleja en todas —también en las anteriores— y en la plantilla Excel.
import { useMemo, useState } from 'react'
import { activarCorrida, getComparacion } from '../api/guiosad.js'
import {
  IcoCheck, IcoFlecha, IcoChevron, IcoAlerta, IcoVolver, IcoMedidor, IcoPulgar, IcoResultados,
  IcoCarpeta, IcoBuscar, IcoCapas, IcoFactores,
} from './Iconos.jsx'

const RESUMEN_KEY = 'guiosad-lit-resumen'

const NIVEL = { 1: 'Irrelevante', 2: 'Opcional', 3: 'Importante', 4: 'Fundamental' }
const DIMENSIONES = [
  { nombre: 'Tecnológica', clase: 'tec' },
  { nombre: 'Organizacional', clase: 'org' },
  { nombre: 'Económica', clase: 'eco' },
]

function Ficha({ etiqueta, valor, pie, tono, Icono, texto }) {
  return (
    <li className={`ficha ficha-${tono}${texto ? ' ficha-texto' : ''}`} title={pie ? `${etiqueta}: ${valor} · ${pie}` : undefined}>
      <span className="ficha-icono"><Icono /></span>
      <span className="ficha-etiqueta">{etiqueta}</span>
      <span className={`ficha-valor chip chip-${tono}`}>{valor}</span>
    </li>
  )
}

function Diferencia({ valor, etiqueta }) {
  if (!valor) return null
  const sube = valor > 0
  return (
    <span className={`litr-delta ${sube ? 'sube' : 'baja'}`}>
      {etiqueta} {sube ? '▲' : '▼'} {Math.abs(valor)}
    </span>
  )
}

export default function ResultadosLiteratura({ detalle, onActualizado }) {
  const [abierto, setAbierto] = useState(null)
  const [dimension, setDimension] = useState('Tecnológica')
  const [comparacion, setComparacion] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  // El resumen se puede ocultar; se recuerda la elección.
  const [verResumen, setVerResumen] = useState(() => {
    try { return localStorage.getItem(RESUMEN_KEY) !== 'oculto' } catch { return true }
  })

  function alternarResumen() {
    setVerResumen(v => {
      try { localStorage.setItem(RESUMEN_KEY, v ? 'oculto' : 'visible') } catch { /* modo privado */ }
      return !v
    })
  }

  const filas = detalle?.resultados || []
  const rMax = useMemo(() => Math.max(1, ...filas.map(f => Number(f.r) || 0)), [filas])
  const grupos = useMemo(() => DIMENSIONES.map(d => {
    const propias = filas.filter(f => f.dimension === d.nombre)
    return { ...d, filas: propias, iguales: propias.filter(f => !f.diff_il && !f.diff_is).length }
  }).filter(g => g.filas.length), [filas])
  const m = detalle?.metricas || {}
  const total = m.total ?? 18

  if (!detalle) return null
  const grupo = grupos.find(g => g.nombre === dimension) || grupos[0]

  // Cifras del resumen, todas derivadas de la corrida ya calculada.
  const fundamentales = filas.filter(f => f.il === 4).length
  const masEvidencia = [...filas].sort((a, b) => (b.tc || 0) - (a.tc || 0))[0]
  const tcPorDim = grupos.map(g => ({ nombre: g.nombre, tc: g.filas.reduce((s, f) => s + (f.tc || 0), 0) }))
    .sort((a, b) => b.tc - a.tc)[0]
  const fichas = [
    { etiqueta: 'IL exactos', valor: `${m.il_exactos ?? '—'}/${total}`, pie: 'IL igual al de la tesis', tono: 'azul', Icono: IcoCheck },
    { etiqueta: 'IL a ±1', valor: `${m.il_dentro_de_1 ?? '—'}/${total}`, pie: 'difiere como mucho un nivel', tono: 'morado', Icono: IcoMedidor },
    { etiqueta: 'IS iguales', valor: `${m.is_iguales ?? '—'}/${total}`, pie: 'IS igual a la de la tesis', tono: 'verde', Icono: IcoPulgar },
    { etiqueta: 'Spearman', valor: m.spearman != null ? m.spearman.toFixed(3) : '—', pie: 'correlación con la Tabla 5.3', tono: 'naranja', Icono: IcoResultados },
    { etiqueta: 'Artículos relevantes', valor: `${detalle.total_relevantes ?? '—'}`, pie: `de ${detalle.total_articulos ?? '—'} analizados`, tono: 'turquesa', Icono: IcoCarpeta },
    { etiqueta: 'Factores fundamentales', valor: fundamentales, pie: 'IL = 4', tono: 'rojo', Icono: IcoFactores },
    { etiqueta: 'Factor con más evidencia', valor: masEvidencia ? masEvidencia.nombre : '—', pie: masEvidencia ? `TC ${masEvidencia.tc}` : '', tono: 'ambar', Icono: IcoBuscar, texto: true },
    { etiqueta: 'Dimensión más citada', valor: tcPorDim ? tcPorDim.nombre : '—', pie: tcPorDim ? `TC ${tcPorDim.tc}` : '', tono: 'rosa', Icono: IcoCapas, texto: true },
  ]

  async function cambiarActivacion() {
    const accion = detalle.activada ? 'desactivar' : 'activar'
    const aviso = accion === 'activar'
      ? `¿Aplicar la IS de la corrida #${detalle.id} al catálogo?\n\nLa importancia sugerida de los factores cambiará y todas las evaluaciones —también las anteriores— y la plantilla Excel se calcularán con ella. Se puede revertir.`
      : `¿Revertir el catálogo?\n\nLa importancia sugerida vuelve a los valores que tenía antes de aplicar la corrida #${detalle.id}, y las evaluaciones se recalculan con ellos.`
    if (!window.confirm(aviso)) return
    setOcupado(true)
    setError('')
    try {
      onActualizado?.(await activarCorrida(detalle.id, accion))
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function alternarComparacion() {
    if (comparacion) { setComparacion(null); return }
    try {
      setComparacion(await getComparacion(detalle.id))
    } catch (e) {
      setError(e.message)
    }
  }

  const diferentes = comparacion?.resultados.filter(r => r.il !== r.il_tesis || r.is !== r.is_tesis) || []

  return (
    <>
      <section className="lit-panel litr">
        <div className="litr-cab">
          <div>
            <span className="litr-eyebrow">Corrida #{detalle.id} · {detalle.rango}</span>
            <h2 className="litr-titulo">{detalle.nombre}</h2>
          </div>
          <div className="litr-acciones">
            <button type="button" className={`litr-boton ${comparacion ? 'activo' : ''}`} onClick={alternarComparacion}>
              <IcoFlecha /> {comparacion ? 'Ocultar comparación' : 'Comparar con Tabla 5.3'}
            </button>
            <button type="button" disabled={ocupado || detalle.estado !== 'listo'}
                    className={`litr-boton ${detalle.activada ? 'litr-boton-revertir' : 'litr-boton-aplicar'}`}
                    onClick={cambiarActivacion}>
              {detalle.activada ? <><IcoVolver /> Revertir catálogo</> : <><IcoCheck /> Aplicar IS al catálogo</>}
            </button>
          </div>
        </div>

        <div className={`litr-catalogo ${detalle.activada ? 'aplicada' : ''}`}>
          {detalle.activada ? <IcoCheck /> : <IcoAlerta />}
          {detalle.activada
            ? <span><b>Aplicada al catálogo.</b> Todas las evaluaciones, también las anteriores, y la plantilla Excel usan esta IS.</span>
            : <span>Esta corrida no está aplicada: las evaluaciones usan la IS vigente del catálogo. Al aplicarla se recalculan todas.</span>}
        </div>

        {error && <div className="lit-error">{error}</div>}

        {comparacion && (
          <div className="litr-comparacion">
            <p>
              IL* e IS* son los valores de la tesis (2008–2019). Esta corrida usa {comparacion.rango} y
              la definición de TC «{comparacion.metodo_tc}»; las diferencias son esperables al cambiar
              fuentes, rango o forma de contar.
            </p>
            {diferentes.length ? (
              <div className="litr-comparacion-lista">
                {diferentes.map(r => (
                  <span key={r.factor} className="litr-comparacion-item">
                    <b>{r.factor}</b> IL {r.il_tesis}→{r.il} · IS {r.is_tesis}→{r.is}
                  </span>
                ))}
              </div>
            ) : <p><b>Sin diferencias respecto a la Tabla 5.3.</b></p>}
          </div>
        )}

        <div className={`litr-resumen ${verResumen ? '' : 'plegado'}`}>
          <header className="resumen-cab">
            <h3 className="chip chip-azul">Resumen</h3>
            <span>{total} factores · {detalle.total_relevantes ?? 0} artículos relevantes · {(detalle.fuentes || []).join(', ')}</span>
            <button type="button" className="litr-resumen-toggle" aria-expanded={verResumen} onClick={alternarResumen}>
              {verResumen ? 'Ocultar resumen' : 'Mostrar resumen'} <IcoChevron />
            </button>
          </header>
          {verResumen && (
            <ul className="fichas">
              {fichas.map(f => <Ficha key={f.etiqueta} {...f} />)}
            </ul>
          )}
        </div>
      </section>

      <section className="lit-panel litr">
        <nav className="litr-pestanas" role="tablist" aria-label="Dimensiones">
          {grupos.map(g => (
            <button key={g.nombre} type="button" role="tab" aria-selected={grupo?.nombre === g.nombre}
                    className={`litr-pestana litr-grupo-${g.clase} ${grupo?.nombre === g.nombre ? 'activa' : ''}`}
                    onClick={() => { setDimension(g.nombre); setAbierto(null) }}>
              <span className="litr-pestana-punto" />
              {g.nombre}
              <span className="litr-pestana-cuenta">{g.filas.length}</span>
              <small>{g.iguales}/{g.filas.length} iguales a la tesis</small>
            </button>
          ))}
        </nav>

        {grupo && (
          <div className="litr-tabla-wrap">
            <table className="litr-tabla">
              <thead>
                <tr>
                  <th className="litr-col-factor">Factor</th>
                  <th title="Total de citas (menciones)">TC</th>
                  <th title="Número de subfactores">NS</th>
                  <th title="r = TC / NS">r</th>
                  <th>Importancia literatura (IL)</th>
                  <th title="Importancia sugerida calculada">IS</th>
                  <th className="litr-col-tesis" title="Valores de la Tabla 5.3">Tesis IL* · IS*</th>
                  <th>Diferencia</th>
                  <th aria-label="Detalle" />
                </tr>
              </thead>
              <tbody>
                {grupo.filas.map(f => (
                  <FilaFactor key={f.id} fila={f} clase={grupo.clase} rMax={rMax}
                              abierto={abierto === f.id}
                              onToggle={() => setAbierto(abierto === f.id ? null : f.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function FilaFactor({ fila, clase, rMax, abierto, onToggle }) {
  const r = Number(fila.r) || 0
  const is = fila.is_calculada ?? fila.is
  const igual = !fila.diff_il && !fila.diff_is
  return (
    <>
      <tr className={`litr-fila litr-borde-${clase} ${abierto ? 'abierta' : ''}`} onClick={onToggle}>
        <td className="litr-col-factor">
          <b>{fila.nombre}</b>
          <small>{fila.articulos?.length || 0} artículos</small>
        </td>
        <td className="litr-num">{fila.tc}</td>
        <td className="litr-num">{fila.ns}</td>
        <td>
          <span className="litr-r">
            <span className="litr-r-barra"><span className={`litr-r-${clase}`} style={{ width: `${(r / rMax) * 100}%` }} /></span>
            {r.toFixed(2)}
          </span>
        </td>
        <td><span className={`litr-nivel litr-nivel-${fila.il}`}>{fila.il} · {NIVEL[fila.il]}</span></td>
        <td><span className={`litr-is litr-is-${is}`}>{is}</span></td>
        <td className="litr-col-tesis"><span className="litr-tesis">{fila.il_tesis} · {fila.is_tesis}</span></td>
        <td>
          {igual
            ? <span className="litr-igual"><IcoCheck /> Igual</span>
            : <span className="litr-deltas"><Diferencia valor={fila.diff_il} etiqueta="IL" /><Diferencia valor={fila.diff_is} etiqueta="IS" /></span>}
        </td>
        <td className="litr-chevron"><IcoChevron /></td>
      </tr>
      {abierto && (
        <tr className="litr-detalle">
          <td colSpan="9">
            <div className="litr-detalle-cab">Artículos que sustentan este factor ({fila.articulos?.length || 0})</div>
            {!fila.articulos?.length && <p className="lit-vacio">Sin evidencia asignada en esta corrida.</p>}
            <ul className="litr-articulos">
              {(fila.articulos || []).map((a, i) => (
                <li key={`${a.id}-${i}`}>
                  <span className="litr-anio">{a.anio || '—'}</span>
                  <div>
                    <b>{a.titulo}</b>
                    {a.evidencia && <small>«{a.evidencia}»</small>}
                    {a.doi && <code>{a.doi}</code>}
                  </div>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}
