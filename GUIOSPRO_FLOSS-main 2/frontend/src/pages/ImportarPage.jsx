// Evaluación a partir de una plantilla: se descarga, se llena fuera del sistema y
// se sube. El backend la convierte en la misma evaluación que arma el asistente y
// la calcula con el mismo motor; al terminar se salta directo a los resultados.
// El diseño sigue el de la portada del asistente: cabecera con degradado, accesos
// circulares y tarjetas con iconos de color.
import { useEffect, useRef, useState } from 'react'
import { URL_PLANTILLA, importarPlantilla, getEstadoCatalogo } from '../api/guiosad.js'
import {
  IcoDescargar, IcoSubir, IcoEditar, IcoAlerta, IcoHistorial, IcoNuevaEval, IcoResultados, IcoExcel,
  IcoBuscar, IcoCapas,
} from '../components/Iconos.jsx'

const PASOS = [
  { tono: 'azul', Icono: IcoDescargar, titulo: 'Descargue', chip: 'Plantilla .xlsx',
    texto: 'Trae las dimensiones, factores y subfactores vigentes. Se genera en el momento.' },
  { tono: 'morado', Icono: IcoEditar, titulo: 'Llénela', chip: 'Listas desplegables',
    texto: 'Importancia de cada factor y cumplimiento de cada subfactor, con lo que tiene su sistema.' },
  { tono: 'verde', Icono: IcoSubir, titulo: 'Súbala', chip: 'Mismas reglas',
    texto: 'Se calcula con el mismo motor que el asistente y salta directo a los resultados.' },
]

const REGLAS = [
  { chip: 'Factor vacío', tono: 'rojo', texto: 'Sin importancia ni valoraciones: queda fuera del cálculo.' },
  { chip: 'Dimensión vacía', tono: 'rojo', texto: 'Si todos sus factores quedan vacíos, la dimensión no entra.' },
  { chip: 'Subfactor vacío', tono: 'ambar', texto: 'En un factor que sí entra, cuenta como «No cumple».' },
  { chip: 'Sin importancia', tono: 'ambar', texto: 'Si valoró subfactores, se usa la mínima.' },
]

export default function ImportarPage({ onNavigate }) {
  const [subiendo, setSubiendo] = useState(false)
  const [errores, setErrores] = useState([])
  const [arrastrando, setArrastrando] = useState(false)
  const entrada = useRef(null)
  // Catálogo con el que se calculará: si se aplica una corrida de literatura
  // cambia la IS, y con ella la plantilla y el resultado de las evaluaciones.
  const [catalogo, setCatalogo] = useState(null)
  const [verIS, setVerIS] = useState(false)

  useEffect(() => {
    getEstadoCatalogo().then(setCatalogo).catch(() => setCatalogo(null))
  }, [])

  // La versión en la URL evita que el navegador reutilice una plantilla vieja.
  const urlPlantilla = catalogo ? `${URL_PLANTILLA}?v=${catalogo.version}` : URL_PLANTILLA

  async function subir(archivo) {
    if (!archivo || subiendo) return
    setErrores([])
    if (!archivo.name.toLowerCase().endsWith('.xlsx')) {
      setErrores(['La plantilla debe ser un archivo de Excel (.xlsx).'])
      return
    }
    if (archivo.size === 0) {
      setErrores(['El archivo está vacío. Descargue la plantilla de nuevo y llénela.'])
      return
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setErrores([`El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB.`])
      return
    }
    setSubiendo(true)
    try {
      const res = await importarPlantilla(archivo)
      onNavigate?.('historial', { ver: res.id, resumen: res.resumen })
    } catch (e) {
      setErrores(e.errores || [e.message])
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  function soltar(e) {
    e.preventDefault()
    setArrastrando(false)
    subir(e.dataTransfer.files?.[0])
  }

  return (
    <div className="imp">
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Evaluar con plantilla</h1>
        <p className="page-subtitle">Evalúe un sistema sin pasar por el asistente: suba la plantilla llena y vea el resultado.</p>
      </div>

      <section className="hero imp-hero">
        <span className="hero-paso">Evaluación rápida</span>
        <h2 className="hero-titulo">Suba su plantilla y obtenga el resultado</h2>

        <label
          className={`imp-zona${arrastrando ? ' imp-zona-activa' : ''}${subiendo ? ' imp-zona-ocupada' : ''}`}
          onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
        >
          <input
            ref={entrada}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={e => subir(e.target.files?.[0])}
            disabled={subiendo}
            hidden
          />
          <span className="imp-zona-icono">{subiendo ? <span className="imp-girando" /> : <IcoExcel />}</span>
          <span className="imp-zona-texto">
            {subiendo ? 'Analizando la plantilla…' : 'Arrastre aquí la plantilla llena o haga clic para elegirla'}
          </span>
          <span className="imp-zona-nota">Archivo .xlsx de hasta 5 MB</span>
        </label>

        <div className="hero-accesos">
          <a className="acceso acceso-azul" href={urlPlantilla} download title="Plantilla en blanco con el catálogo actual">
            <span className="acceso-circulo"><IcoDescargar /></span>
            <span className="acceso-etiqueta">Descargar plantilla</span>
          </a>
          <button type="button" className="acceso acceso-verde" onClick={() => onNavigate?.('evaluacion')}>
            <span className="acceso-circulo"><IcoNuevaEval /></span>
            <span className="acceso-etiqueta">Usar el asistente</span>
          </button>
          <button type="button" className="acceso acceso-morado" onClick={() => onNavigate?.('historial')}>
            <span className="acceso-circulo"><IcoHistorial /></span>
            <span className="acceso-etiqueta">Historial</span>
          </button>
        </div>
      </section>

      {catalogo && (
        <section className={`card imp-catalogo ${catalogo.origen === 'literatura' ? 'es-literatura' : ''}`}>
          <div className="imp-catalogo-fila">
            <span className="imp-catalogo-icono">{catalogo.origen === 'literatura' ? <IcoBuscar /> : <IcoCapas />}</span>
            <div className="imp-catalogo-texto">
              <span className="imp-catalogo-eti">Importancia sugerida vigente</span>
              <b>
                {catalogo.origen === 'literatura'
                  ? `Corrida de literatura #${catalogo.corrida.id} · ${catalogo.corrida.nombre} (${catalogo.corrida.rango})`
                  : 'Tabla 5.3 de la tesis'}
              </b>
              <small>
                La plantilla se descarga con estos valores y las evaluaciones se calculan con ellos.
                Si se aplica o revierte una corrida, todo se actualiza solo.
              </small>
            </div>
            <span className="chip chip-turquesa" title="Huella del catálogo; la plantilla la lleva dentro">
              versión {catalogo.version}
            </span>
            <button type="button" className="imp-catalogo-ver" aria-expanded={verIS} onClick={() => setVerIS(v => !v)}>
              {verIS ? 'Ocultar IS' : 'Ver IS por factor'}
            </button>
          </div>
          {verIS && (
            <div className="imp-catalogo-is">
              {catalogo.factores.map(f => (
                <span key={f.id} className="imp-is-item" title={f.dimension}>
                  <span>{f.nombre}</span><b className={`litr-is litr-is-${f.importancia_sugerida}`}>{f.importancia_sugerida}</b>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {errores.length > 0 && (
        <div className="imp-errores" role="alert">
          <div className="imp-errores-cab"><IcoAlerta /> No se pudo usar la plantilla</div>
          <ul>
            {errores.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <p>Corrija estas celdas en el archivo y vuelva a subirlo.</p>
        </div>
      )}

      <div className="imp-info">
        <section className="card imp-tarjeta">
          <div className="imp-tarjeta-cab">
            <span className="chip chip-azul">Cómo funciona</span>
            <span className="imp-tarjeta-nota">3 pasos</span>
          </div>
          <div className="imp-pasos">
            {PASOS.map(({ tono, Icono, titulo, chip, texto }) => (
              <div key={titulo} className="imp-paso">
                <span className={`imp-circulo imp-${tono}`}><Icono /></span>
                <span className="imp-paso-titulo">{titulo}</span>
                <span className={`chip chip-${tono}`}>{chip}</span>
                <span className="imp-paso-texto">{texto}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card imp-tarjeta">
          <div className="imp-tarjeta-cab">
            <span className="chip chip-morado">Lo que deja vacío</span>
            <span className="imp-tarjeta-nota">la hoja «Instrucciones» lo detalla</span>
          </div>
          <ul className="imp-reglas">
            {REGLAS.map(({ chip, tono, texto }) => (
              <li key={chip}>
                <span className={`chip chip-${tono}`}>{chip}</span>
                <span>{texto}</span>
              </li>
            ))}
          </ul>
          <p className="imp-pie"><IcoResultados /> El resultado aparece en el historial con un resumen de lo que entró y lo que quedó fuera.</p>
        </section>
      </div>
    </div>
  )
}
