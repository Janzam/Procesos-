// Importancia de la literatura: configura una corrida, muestra el avance en vivo
// y presenta los 18 factores con TC, NS, r, IL e IS calculados por el backend.
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  getConfigLiteratura, getCorridas, crearCorrida, getCorrida,
  getProgreso, reanudarCorrida, eliminarCorrida,
} from '../api/guiosad.js'
import {
  IcoBuscar, IcoAlerta, IcoCheck, IcoMedidor, IcoReloj, IcoBorrar, IcoCapas, IcoResultados,
  IcoChevron, IcoTabla,
} from '../components/Iconos.jsx'
import { recordarCorrida, CORRIDA_KEY } from './LiteraturaTablaPage.jsx'

const HISTORIAL_KEY = 'guiosad-lit-historial'

// Validación del formulario de corrida. Las mismas reglas las aplica el
// backend; aquí se avisan antes, junto a cada campo.
function validarForm(form, anioActual) {
  const errores = {}
  const entero = v => String(v).trim() !== '' && Number.isInteger(Number(v))
  if (!String(form.nombre || '').trim()) errores.nombre = 'Escriba un nombre para la corrida.'
  else if (form.nombre.trim().length > 120) errores.nombre = 'Máximo 120 caracteres.'
  if (!entero(form.anio_inicio)) errores.anio_inicio = 'Año no válido.'
  else if (form.anio_inicio < 1990 || form.anio_inicio > anioActual) errores.anio_inicio = `Entre 1990 y ${anioActual}.`
  if (!entero(form.anio_fin)) errores.anio_fin = 'Año no válido.'
  else if (form.anio_fin < 1990 || form.anio_fin > anioActual) errores.anio_fin = `Entre 1990 y ${anioActual}.`
  if (!errores.anio_inicio && !errores.anio_fin && Number(form.anio_inicio) > Number(form.anio_fin)) {
    errores.anio_fin = '«Hasta» no puede ser menor que «Desde».'
  }
  if (!entero(form.max_articulos) || form.max_articulos < 0 || form.max_articulos > 10000) {
    errores.max_articulos = 'Número entero entre 0 y 10000.'
  }
  if (!form.fuentes.length) errores.fuentes = 'Elija al menos una base de datos.'
  return errores
}
const PRESETS = [
  { inicio: 2008, fin: 2019, titulo: 'Tesis', detalle: '2008 – 2019' },
  { inicio: 2020, fin: 2025, titulo: 'Innovación', detalle: '2020 – 2025' },
]
const FUENTES = {
  openalex: { nombre: 'OpenAlex', detalle: 'Gratuita' },
  crossref: { nombre: 'Crossref', detalle: 'DOI' },
  scopus:   { nombre: 'Scopus',   detalle: 'Institucional' },
}
const ESTADO_TONO = { listo: 'verde', error: 'rojo', ejecutando: 'azul', pendiente: 'azul', pausada: 'ambar' }
const PROVEEDOR_NOMBRE = { groq: 'Groq', openai: 'OpenAI', anthropic: 'Anthropic', demo: 'Demo' }

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

export default function LiteraturaPage({ onNavigate }) {
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState(initForm(null))
  const [corridas, setCorridas] = useState([])
  const [activa, setActiva] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [eventos, setEventos] = useState([])
  // Corridas anteriores plegables; se recuerda si estaban abiertas.
  const [verHistorial, setVerHistorial] = useState(() => {
    try { return localStorage.getItem(HISTORIAL_KEY) !== 'oculto' } catch { return true }
  })
  const [verTodas, setVerTodas] = useState(false)
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
    // Al volver al apartado se reabre la última corrida consultada.
    let recordada = null
    try { recordada = Number(localStorage.getItem(CORRIDA_KEY)) || null } catch { /* modo privado */ }
    if (recordada) verCorrida(recordada, true)
    return () => clearInterval(timer.current)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(HISTORIAL_KEY, verHistorial ? 'visible' : 'oculto') } catch { /* modo privado */ }
  }, [verHistorial])

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
          recordarCorrida(completo.id)
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
    setDetalle(null)
    ultimoEvento.current = 0
    try {
      const corrida = await crearCorrida({ ...form, nombre: form.nombre.trim(), forzar_reanalisis: forzar })
      setActiva(corrida)
      setCorridas(prev => [corrida, ...prev])
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function verCorrida(id, silencioso = false) {
    setError('')
    try {
      const completo = await getCorrida(id)
      setActiva(completo)
      setDetalle(completo)
      setEventos([])
      recordarCorrida(id)
    } catch (e) {
      if (!silencioso) setError(e.message)
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
      if (detalle?.id === corrida.id) setDetalle(null)
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

  const corridasListas = corridas.filter(c => c.estado === 'listo').length
  const corridaAplicada = corridas.find(c => c.activada)
  const proveedorNombre = PROVEEDOR_NOMBRE[config?.proveedor_ia] || config?.proveedor_ia || '—'
  const errores = validarForm(form, config?.anio_actual || new Date().getFullYear())
  const hayErrores = Object.keys(errores).length > 0
  const anioMax = config?.anio_actual || new Date().getFullYear()

  return (
    <div className="lit-page">
      <section className="lit-hero">
        <div className="lit-hero-texto">
          <span className="lit-hero-etiqueta">Innovación · CP2</span>
          <h1>Importancia de la literatura</h1>
          <p>
            Busca evidencia de adopción FLOSS, la clasifica con IA y calcula la importancia
            sugerida de los 18 factores con las fórmulas de la tesis.
          </p>
          <div className="lit-hero-cifras">
            <div><b>{corridas.length}</b><span>corridas</span></div>
            <div><b>{corridasListas}</b><span>completadas</span></div>
            <div><b>{corridaAplicada ? `#${corridaAplicada.id}` : '—'}</b><span>aplicada al catálogo</span></div>
            <div><b>{proveedorNombre}</b><span>clasificador IA</span></div>
          </div>
        </div>
        <div className="lit-hero-lupa" aria-hidden="true"><IcoBuscar /></div>
      </section>

      {config?.proveedor_ia === 'demo' && (
        <div className="lit-aviso"><IcoAlerta /> Modo demostración: los valores no son válidos para la tesis.</div>
      )}
      {config && !config.ia_configurada && (
        <div className="lit-aviso">
          <IcoAlerta /> Falta la clave de {proveedorNombre} en el entorno.
        </div>
      )}

      {error && <div className="lit-error">{error}</div>}

      <div className="lit-rejilla">
        <section className="lit-panel">
          <h2><span className="lit-h2-icono lit-tono-naranja"><IcoMedidor /></span> Nueva corrida</h2>
          <div className="lit-presets" role="group" aria-label="Rango predefinido">
            {PRESETS.map(p => {
              const activo = form.anio_inicio === p.inicio && form.anio_fin === p.fin
              return (
                <button key={p.titulo} type="button" className={activo ? 'activo' : ''}
                        aria-pressed={activo} onClick={() => cambiarPreseto(p.inicio, p.fin)}>
                  <b>{p.titulo}</b><span>{p.detalle}</span>
                </button>
              )
            })}
          </div>

          <label className={`lit-campo ${errores.nombre ? 'con-error' : ''}`}>
            <span>Nombre</span>
            <input value={form.nombre} maxLength={120} aria-invalid={Boolean(errores.nombre)}
                   onChange={e => setForm({ ...form, nombre: e.target.value })} />
            {errores.nombre && <em className="lit-error-campo">{errores.nombre}</em>}
          </label>
          <div className="lit-dos-columnas">
            <label className={`lit-campo ${errores.anio_inicio ? 'con-error' : ''}`}>
              <span>Desde</span>
              <input type="number" min="1990" max={anioMax} step="1" value={form.anio_inicio}
                     aria-invalid={Boolean(errores.anio_inicio)}
                     onChange={e => setForm({ ...form, anio_inicio: e.target.value === '' ? '' : Number(e.target.value) })} />
              {errores.anio_inicio && <em className="lit-error-campo">{errores.anio_inicio}</em>}
            </label>
            <label className={`lit-campo ${errores.anio_fin ? 'con-error' : ''}`}>
              <span>Hasta</span>
              <input type="number" min="1990" max={anioMax} step="1" value={form.anio_fin}
                     aria-invalid={Boolean(errores.anio_fin)}
                     onChange={e => setForm({ ...form, anio_fin: e.target.value === '' ? '' : Number(e.target.value) })} />
              {errores.anio_fin && <em className="lit-error-campo">{errores.anio_fin}</em>}
            </label>
          </div>

          <label className={`lit-campo ${errores.max_articulos ? 'con-error' : ''}`}>
            <span>Máx. artículos (0 = todos)</span>
            <input type="number" min="0" max="10000" step="1" value={form.max_articulos}
                   aria-invalid={Boolean(errores.max_articulos)}
                   onChange={e => setForm({ ...form, max_articulos: e.target.value === '' ? '' : Number(e.target.value) })} />
            {errores.max_articulos
              ? <em className="lit-error-campo">{errores.max_articulos}</em>
              : <small>Para probar métricas rápido, pon por ejemplo 20.</small>}
          </label>

          <div className="lit-fuentes-cab">Bases de datos</div>
          <div className="lit-fuentes-tarjetas">
            {(config?.fuentes || ['openalex']).map(id => {
              const listo = config?.fuentes_configuradas?.[id]
              const marcada = form.fuentes.includes(id)
              const info = FUENTES[id] || { nombre: id, detalle: '' }
              return (
                <button key={id} type="button" aria-pressed={marcada}
                        className={`lit-fuente ${marcada ? 'marcada' : ''} ${listo ? '' : 'sin-clave'}`}
                        onClick={() => alternarFuente(id)}>
                  <span className="lit-fuente-check">{marcada && <IcoCheck />}</span>
                  <span className="lit-fuente-texto">
                    <b>{info.nombre}</b>
                    <small>{listo ? info.detalle : 'sin credencial'}</small>
                  </span>
                </button>
              )
            })}
          </div>
          {errores.fuentes && <em className="lit-error-campo lit-error-fuentes">{errores.fuentes}</em>}

          <div className="lit-acciones-inicio">
            <button className="lit-boton-principal" disabled={ocupado || hayErrores}
                    onClick={() => iniciar(false)}>
              <IcoBuscar /> Iniciar análisis
            </button>
            <button className="lit-boton-forzar" disabled={ocupado || hayErrores}
                    onClick={() => iniciar(true)}>
              Reanalizar todo (sin caché)
            </button>
          </div>
          {config && (
            <div className="lit-meta">
              <span title="Proveedor y modelo de IA"><IcoCapas /> {proveedorNombre} · {config.modelo}</span>
              <span title="Versión del prompt">Prompt {config.version_prompt}</span>
              <span title="Importancia de la experiencia (fija)">IE fijo {config.ie_tesis}</span>
            </div>
          )}
        </section>

        <section className="lit-panel">
          <h2><span className="lit-h2-icono lit-tono-azul"><IcoReloj /></span> Progreso</h2>
          {!activa && (
            <div className="lit-vacio-estado">
              <span className="lit-vacio-icono"><IcoResultados /></span>
              <b>Ninguna corrida seleccionada</b>
              <p>Inicia un análisis o abre una corrida anterior para ver su avance y resultados.</p>
            </div>
          )}
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
            <div className={`lit-historial ${verHistorial ? '' : 'plegado'}`}>
              <button type="button" className="lit-historial-toggle" aria-expanded={verHistorial}
                      onClick={() => setVerHistorial(v => !v)}>
                <span>Corridas anteriores</span>
                <span className="lit-historial-cuenta">{corridas.length}</span>
                <span className="lit-historial-accion">{verHistorial ? 'Ocultar' : 'Mostrar'} <IcoChevron /></span>
              </button>
              {verHistorial && corridas.slice(0, verTodas ? corridas.length : 5).map(c => {
                const enCurso = ['pendiente', 'ejecutando'].includes(c.estado)
                return (
                  <div key={c.id} className={`lit-historial-fila ${detalle?.id === c.id ? 'activo' : ''}`}>
                    <button type="button" className="lit-historial-abrir" onClick={() => verCorrida(c.id)}>
                      <span className="lit-historial-num">#{c.id}</span>
                      <span className="lit-historial-texto">
                        <b>{c.nombre || `Literatura ${c.rango}`}</b>
                        <small>{c.rango}{Array.isArray(c.fuentes) && c.fuentes.length ? ` · ${c.fuentes.map(f => FUENTES[f]?.nombre || f).join(', ')}` : ''}</small>
                      </span>
                      <span className="lit-historial-chips">
                        {c.es_reproduccion && <span className="chip chip-morado">reproducible</span>}
                        {c.activada && <span className="chip chip-naranja">aplicada</span>}
                        <span className={`chip chip-${ESTADO_TONO[c.estado] || 'azul'}`}>{c.estado}</span>
                      </span>
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
              {verHistorial && corridas.length > 5 && (
                <button type="button" className="lit-historial-mas" onClick={() => setVerTodas(v => !v)}>
                  {verTodas ? 'Ver menos' : `Ver las ${corridas.length} corridas`}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {detalle && detalle.estado === 'listo' && (
        <div className="lit-ir-tabla">
          <span>
            <b>Corrida #{detalle.id} · {detalle.nombre}</b> lista
            {detalle.activada ? ' y aplicada al catálogo' : ''}. Sus resultados están en <b>Tabla de resultados</b>.
          </span>
          <button type="button" onClick={() => { recordarCorrida(detalle.id); onNavigate?.('literatura-tabla') }}>
            <IcoTabla /> Ver tabla de resultados
          </button>
        </div>
      )}
    </div>
  )
}
