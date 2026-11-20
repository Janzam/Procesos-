// Importancia de la literatura: configura una corrida, muestra el avance en vivo
// y presenta los 18 factores con TC, NS, r, IL e IS calculados por el backend.
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  getConfigLiteratura, getCorridas, crearCorrida, getCorrida,
  getProgreso, reanudarCorrida, activarCorrida, getComparacion, eliminarCorrida,
} from '../api/guiosad.js'
import { IcoChispa, IcoAlerta, IcoCheck, IcoMedidor, IcoFlecha, IcoReloj, IcoBorrar } from '../components/Iconos.jsx'

const NIVEL = { 1: 'Irrelevante', 2: 'Opcional', 3: 'Importante', 4: 'Fundamental' }
const DIMENSION_CLASE = { Tecnológica: 'tec', Organizacional: 'org', Económica: 'eco' }

function cortar(texto, max) {
  if (!texto) return ''
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

function initForm(config) {
  return {
    nombre: 'Literatura 2020-2025',
    anio_inicio: 2020,
    anio_fin: 2025,
    fuentes: ['openalex'],
    metodo_tc: 'menciones',
    max_articulos: config?.max_articulos_actual || 0,
  }
}

export default function LiteraturaPage() {
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState(initForm(null))
  const [corridas, setCorridas] = useState([])
  const [activa, setActiva] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [eventos, setEventos] = useState([])
  const [comparacion, setComparacion] = useState(null)
  const [abierto, setAbierto] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [borrando, setBorrando] = useState(null)
  const ultimoEvento = useRef(0)
  const timer = useRef(null)

  useEffect(() => {
    getConfigLiteratura().then(c => {
      setConfig(c)
      setForm(initForm(c))
    }).catch(e => setError(e.message))
    getCorridas().then(setCorridas).catch(() => setCorridas([]))
    return () => clearInterval(timer.current)
  }, [])

  useEffect(() => {
    if (!activa || ['listo', 'error'].includes(activa.estado)) return undefined
    timer.current = setInterval(async () => {
      try {
        const estado = await getProgreso(activa.id, ultimoEvento.current || undefined)
        if (estado.eventos.length) {
          ultimoEvento.current = estado.eventos[estado.eventos.length - 1].id
          setEventos(prev => [...prev, ...estado.eventos].slice(-200))
        }
        setActiva(prev => ({ ...prev, ...estado }))
        if (['listo', 'error'].includes(estado.estado)) {
          clearInterval(timer.current)
          const completo = await getCorrida(activa.id)
          setDetalle(completo)
          setActiva(prev => ({ ...prev, ...completo }))
          setCorridas(prev => [completo, ...prev.filter(c => c.id !== completo.id)])
        }
      } catch (e) {
        clearInterval(timer.current)
        setError(e.message)
      }
    }, 1200)
    return () => clearInterval(timer.current)
  }, [activa?.id, activa?.estado])

  function cambiarPreseto(inicio, fin) {
    setForm(prev => ({
      ...prev,
      anio_inicio: inicio,
      anio_fin: fin,
      nombre: `Literatura ${inicio}-${fin}`,
    }))
  }

  function alternarFuente(id) {
    setForm(prev => ({
      ...prev,
      fuentes: prev.fuentes.includes(id)
        ? prev.fuentes.filter(f => f !== id)
        : [...prev.fuentes, id],
    }))
  }

  async function iniciar(forzar = false) {
    setError('')
    setOcupado(true)
    setEventos([])
    setComparacion(null)
    setDetalle(null)
    ultimoEvento.current = 0
    try {
      const corrida = await crearCorrida({ ...form, forzar_reanalisis: forzar })
      setActiva(corrida)
      setCorridas(prev => [corrida, ...prev])
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function verCorrida(id) {
    setError('')
    try {
      const completo = await getCorrida(id)
      setActiva(completo)
      setDetalle(completo)
      setComparacion(null)
      setEventos([])
    } catch (e) {
      setError(e.message)
    }
  }

  async function reanudar() {
    if (!activa) return
    setOcupado(true)
    setError('')
    try {
      const corrida = await reanudarCorrida(activa.id)
      setActiva(corrida)
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function cambiarActivacion(accion) {
    if (!detalle) return
    setOcupado(true)
    setError('')
    try {
      const actualizado = await activarCorrida(detalle.id, accion)
      setDetalle(actualizado)
      setActiva(actualizado)
      setCorridas(prev => prev.map(c => {
        if (c.id === actualizado.id) return actualizado
        if (actualizado.activada && c.activada) return { ...c, activada: false }
        return c
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function verComparacion() {
    if (!detalle) return
    try {
      setComparacion(await getComparacion(detalle.id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function borrarCorrida(corrida) {
    const avisoCatalogo = corrida.activada
      ? '\n\nEsta corrida está aplicada al catálogo: la IS se revertirá a los valores de la tabla de la tesis antes de eliminarla.'
      : ''
    const confirmado = window.confirm(
      `¿Eliminar la corrida #${corrida.id} «${corrida.nombre}»?` +
      `${avisoCatalogo}\n\nSe borrarán sus resultados y su progreso. ` +
      'La caché de clasificaciones se conserva. Esta acción no se puede deshacer.'
    )
    if (!confirmado) return

    setBorrando(corrida.id)
    setError('')
    try {
      await eliminarCorrida(corrida.id)
      setCorridas(prev => prev
        .filter(c => c.id !== corrida.id)
        .map(c => corrida.activada && c.activada ? { ...c, activada: false } : c))
      if (detalle?.id === corrida.id) {
        setDetalle(null)
        setComparacion(null)
        setAbierto(null)
      }
      if (activa?.id === corrida.id) {
        clearInterval(timer.current)
        setActiva(null)
        setEventos([])
        ultimoEvento.current = 0
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBorrando(null)
    }
  }


  const clasificacionesVivas = useMemo(() => {
    const porArticulo = new Map()
    eventos.forEach(ev => {
      const datos = ev.datos || {}
      if (!['relevancia', 'factores', 'omitido'].includes(datos.tipo)) return
      const clave = datos.indice ?? datos.titulo
      const actual = porArticulo.get(clave) || {
        clave,
        titulo: datos.titulo,
        relevante: null,
        conFactores: false,
        factores: [],
        desdeCache: false,
        omitido: false,
      }
      if (datos.tipo === 'relevancia') {
        actual.relevante = datos.relevante
        actual.desdeCache = actual.desdeCache || datos.desde_cache
      }
      if (datos.tipo === 'factores') {
        actual.conFactores = true
        actual.factores = datos.factores || []
        actual.desdeCache = actual.desdeCache || datos.desde_cache
      }
      if (datos.tipo === 'omitido') actual.omitido = true
      porArticulo.set(clave, actual)
    })
    return [...porArticulo.values()].reverse().slice(0, 8)
  }, [eventos])

  const analizando = useMemo(() => {
    const evento = [...eventos].reverse().find(ev => ev.datos?.tipo === 'articulo')
    if (!evento) return null
    const tarjeta = clasificacionesVivas.find(t => t.clave === evento.datos.indice)
    return { ...evento, desdeCache: Boolean(tarjeta?.desdeCache) }
  }, [eventos, clasificacionesVivas])

  return (
    <div className="lit-page">
      <div className="lit-cabecera">
        <div>
          <span className="eyebrow"><IcoChispa /> Innovación · CP2</span>
          <h1>Importancia de la literatura</h1>
          <p className="subtitulo">
            Busca evidencia de adopción FLOSS, la clasifica con IA y calcula la importancia
            sugerida de los 18 factores con las fórmulas de la tesis.
          </p>
        </div>
        {config?.proveedor_ia === 'demo' && (
          <div className="lit-aviso"><IcoAlerta /> Modo demostración: los valores no son válidos para la tesis.</div>
        )}
        {config && !config.ia_configurada && (
          <div className="lit-aviso">
            <IcoAlerta /> Falta la clave de {config.proveedor_ia === 'groq' ? 'Groq' : 'Anthropic'} en el entorno.
          </div>
        )}
      </div>

      {error && <div className="lit-error">{error}</div>}

      <div className="lit-rejilla">
        <section className="lit-panel">
          <h2><IcoMedidor /> Nueva corrida</h2>
          <div className="lit-presets">
            <button type="button" onClick={() => cambiarPreseto(2008, 2019)}>Tesis 2008–2019</button>
            <button type="button" onClick={() => cambiarPreseto(2020, 2025)}>Innovación 2020–2025</button>
          </div>

          <label className="lit-campo">
            <span>Nombre</span>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </label>
          <div className="lit-dos-columnas">
            <label className="lit-campo">
              <span>Desde</span>
              <input type="number" min="1990" max="2030" value={form.anio_inicio}
                     onChange={e => setForm({ ...form, anio_inicio: Number(e.target.value) })} />
            </label>
            <label className="lit-campo">
              <span>Hasta</span>
              <input type="number" min="1990" max="2030" value={form.anio_fin}
                     onChange={e => setForm({ ...form, anio_fin: Number(e.target.value) })} />
            </label>
          </div>

          <label className="lit-campo">
            <span>Máx. artículos (0 = todos)</span>
            <input type="number" min="0" max="10000" value={form.max_articulos}
                   onChange={e => setForm({ ...form, max_articulos: Number(e.target.value) })} />
            <small>Para probar métricas rápido, pon por ejemplo 20.</small>
          </label>

          <fieldset className="lit-fuentes">
            <legend>Bases de datos</legend>
            {(config?.fuentes || ['openalex']).map(id => {
              const listo = config?.fuentes_configuradas?.[id]
              return (
                <label key={id} className={listo ? '' : 'lit-fuente-sin-clave'}>
                  <input type="checkbox" checked={form.fuentes.includes(id)} onChange={() => alternarFuente(id)} />
                  <span>{id}</span>
                  {!listo && <small>sin credencial</small>}
                </label>
              )
            })}
          </fieldset>

          <div className="lit-acciones-inicio">
            <button className="lit-boton-principal" disabled={ocupado || !form.fuentes.length}
                    onClick={() => iniciar(false)}>
              <IcoChispa /> Iniciar análisis
            </button>
            <button className="lit-boton-forzar" disabled={ocupado || !form.fuentes.length}
                    onClick={() => iniciar(true)}>
              Reanalizar todo (sin caché)
            </button>
          </div>
          {config && (
            <p className="lit-nota">
              Prompt <code>{config.version_prompt}</code> · {config.proveedor_ia} / <code>{config.modelo}</code> · IE fijo <b>{config.ie_tesis}</b>
            </p>
          )}
        </section>

        <section className="lit-panel">
          <h2><IcoReloj /> Progreso</h2>
          {!activa && <p className="lit-vacio">Todavía no hay una corrida seleccionada.</p>}
          {activa && (
            <>
              <div className="lit-linea-estado">
                <span className={`lit-estado lit-estado-${activa.estado}`}>{activa.estado}</span>
                <span>{activa.fase}</span>
                {activa.forzar_reanalisis && <span className="lit-forzar">reanálisis forzado</span>}
              </div>
              <div className="lit-barra"><div style={{ width: `${activa.progreso || 0}%` }} /></div>
              <div className="lit-contadores">
                <span><b>{activa.total_articulos || 0}</b> artículos</span>
                <span><b>{activa.total_relevantes || 0}</b> relevantes</span>
                <span><b>{activa.total_desde_cache || 0}</b> desde caché</span>
                <span><b>{activa.total_omitidos || 0}</b> omitidos</span>
              </div>
              {activa.estado === 'pausada' && (
                <div className="lit-pausa">
                  <span>{activa.mensaje}</span>
                  <button disabled={ocupado} onClick={reanudar}>Reanudar corrida</button>
                </div>
              )}
              {(analizando || clasificacionesVivas.length > 0) && (
                <div className="lit-vivo">
                  <div className="lit-vivo-seccion">Clasificación en vivo</div>
                  {activa.estado === 'ejecutando' && analizando && (
                    <div className={`lit-vivo-actual ${analizando.desdeCache ? 'es-cache' : ''}`}>
                      <span className="lit-pulso" />
                      <div>
                        <small>
                          {analizando.desdeCache ? 'Desde caché' : 'Analizando con IA'}{' '}
                          {analizando.datos.indice}/{analizando.datos.total}
                        </small>
                        <strong title={analizando.datos.titulo}>
                          {cortar(analizando.datos.titulo, 105)}
                        </strong>
                      </div>
                    </div>
                  )}
                  <div className="lit-vivo-lista">
                    {clasificacionesVivas.map(t => (
                      <div key={t.clave} className="lit-vivo-item">
                        <div className="lit-vivo-articulo" title={t.titulo}>
                          {t.clave}. {cortar(t.titulo, 88)}
                        </div>
                        <div className="lit-vivo-meta">
                          {t.omitido ? (
                            <span className="lit-badge-no">Omitido</span>
                          ) : (
                            <span className={t.relevante ? 'lit-badge-si' : 'lit-badge-no'}>
                              {t.relevante ? 'Relevante' : 'No relevante'}
                            </span>
                          )}
                          {t.relevante && !t.conFactores && (
                            <span className="lit-vivo-espera">clasificando subfactores…</span>
                          )}
                          {t.conFactores && (
                            <span className="lit-vivo-factores">
                              {t.factores.length
                                ? t.factores.map(f => <em key={f}>{f}</em>)
                                : <em>sin factores</em>}
                            </span>
                          )}
                          {t.desdeCache && (
                            <span className="lit-badge-cache">desde caché · clasificación previa</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ul className="lit-log">
                {eventos.slice(-8).reverse().map(ev => (
                  <li key={ev.id} className={`lit-log-${ev.nivel}`}>
                    <span>{ev.fase}</span> {ev.mensaje}
                  </li>
                ))}
                {!eventos.length && activa.mensaje && <li>{activa.mensaje}</li>}
              </ul>
            </>
          )}
          {!!corridas.length && (
            <div className="lit-historial">
              <span>Corridas anteriores</span>
              {corridas.slice(0, 8).map(c => {
                const enCurso = ['pendiente', 'ejecutando'].includes(c.estado)
                return (
                  <div key={c.id} className={`lit-historial-fila ${detalle?.id === c.id ? 'activo' : ''}`}>
                    <button type="button" className="lit-historial-abrir" onClick={() => verCorrida(c.id)}>
                      #{c.id} · {c.rango} · {c.estado}
                      {c.es_reproduccion && <em> reproducible</em>}
                      {c.activada && <em className="lit-historial-aplicada"> aplicada</em>}
                    </button>
                    <button
                      type="button"
                      className="lit-historial-borrar"
                      title={enCurso ? 'No se puede eliminar mientras la corrida está en curso' : 'Eliminar corrida'}
                      aria-label={`Eliminar corrida #${c.id}`}
                      disabled={borrando === c.id || enCurso}
                      onClick={() => borrarCorrida(c)}
                    >
                      <IcoBorrar />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {detalle && (
        <section className="lit-panel lit-resultados">
          <div className="lit-resultados-cab">
            <h2>Resultados · {detalle.rango}</h2>
            <div className="lit-acciones">
              <button onClick={verComparacion}><IcoFlecha /> Comparar con Tabla 5.3</button>
              <button disabled={ocupado} onClick={() => cambiarActivacion(detalle.activada ? 'desactivar' : 'activar')}>
                <IcoCheck /> {detalle.activada ? 'Revertir catálogo' : 'Aplicar IS al catálogo'}
              </button>
            </div>
          </div>

          <div className="lit-metricas">
            <div><b>{detalle.metricas?.il_exactos ?? '—'}/{detalle.metricas?.total ?? 18}</b><span>IL exactos</span></div>
            <div><b>{detalle.metricas?.il_dentro_de_1 ?? '—'}/{detalle.metricas?.total ?? 18}</b><span>IL a ±1</span></div>
            <div><b>{detalle.metricas?.is_iguales ?? '—'}/{detalle.metricas?.total ?? 18}</b><span>IS iguales</span></div>
            <div><b>{detalle.metricas?.spearman != null ? detalle.metricas.spearman.toFixed(3) : '—'}</b><span>Spearman</span></div>
          </div>

          <div className="lit-tabla-wrap">
            <table className="lit-tabla">
              <thead>
                <tr>
                  <th>Factor</th><th>TC</th><th>NS</th><th>r</th><th>IL</th><th>IS</th>
                  <th>IL*</th><th>IS*</th><th>Δ IL / IS</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.resultados || []).map(r => (
                  <FragmentoFactor key={r.id} fila={r} abierto={abierto === r.id}
                                   onToggle={() => setAbierto(abierto === r.id ? null : r.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {comparacion && (
        <section className="lit-panel">
          <h2>Comparación con la Tabla 5.3</h2>
          <p className="lit-nota">
            IL* e IS* son los valores de la tesis (2008–2019). Esta corrida usa {comparacion.rango}
            y la definición de TC «{comparacion.metodo_tc}». Las diferencias son esperables cuando
            cambian las fuentes, el rango o la forma de contar.
          </p>
          <ul className="lit-comparacion">
            {comparacion.resultados.filter(r => r.il !== r.il_tesis || r.is !== r.is_tesis).map(r => (
              <li key={r.factor}>
                <b>{r.factor}</b>: IL {r.il} vs {r.il_tesis} · IS {r.is} vs {r.is_tesis}
              </li>
            ))}
            {!comparacion.resultados.some(r => r.il !== r.il_tesis || r.is !== r.is_tesis) && (
              <li>Sin diferencias respecto a la Tabla 5.3.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  )
}

function FragmentoFactor({ fila, abierto, onToggle }) {
  const clase = DIMENSION_CLASE[fila.dimension] || 'tec'
  const diferencias = []
  if (fila.diff_il) diferencias.push(`IL ${fila.diff_il > 0 ? '+' : ''}${fila.diff_il}`)
  if (fila.diff_is) diferencias.push(`IS ${fila.diff_is > 0 ? '+' : ''}${fila.diff_is}`)
  return (
    <>
      <tr className={`lit-fila ${abierto ? 'abierta' : ''}`} onClick={onToggle}>
        <td>
          <span className={`lit-punto lit-punto-${clase}`} />
          <b>{fila.nombre}</b>
          <small>{fila.dimension}</small>
        </td>
        <td>{fila.tc}</td>
        <td>{fila.ns}</td>
        <td>{Number(fila.r).toFixed(2)}</td>
        <td><span className="lit-nivel">{fila.il} · {NIVEL[fila.il]}</span></td>
        <td><b>{fila.is_calculada ?? fila.is}</b></td>
        <td className="lit-ref">{fila.il_tesis}</td>
        <td className="lit-ref">{fila.is_tesis}</td>
        <td className={fila.diff_il || fila.diff_is ? 'lit-diff' : ''}>
          {diferencias.length ? diferencias.join(' / ') : '—'}
        </td>
      </tr>
      {abierto && (
        <tr className="lit-detalle-fila">
          <td colSpan="9">
            <b>Artículos que sustentan este factor ({fila.articulos?.length || 0})</b>
            {!fila.articulos?.length && <p className="lit-vacio">Sin evidencia asignada en esta corrida.</p>}
            <ul className="lit-articulos">
              {(fila.articulos || []).map((a, i) => (
                <li key={`${a.id}-${i}`}>
                  <span>{a.anio || '—'}</span>
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
