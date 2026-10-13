// Paso inicial: una cabecera degradada con la pregunta y el nombre del software
// como buscador, la ficha con el resto de datos (todos opcionales) y, debajo,
// las evaluaciones recientes por si se quiere continuar una.
import { useState, useEffect } from 'react'
import { nombreEvaluacion } from '../../utils/software.js'
import { getHistorial } from '../../api/guiosad.js'
import { REC_V, REC_CORTO } from '../../utils/recomendacion.js'
import { fechaCorta } from '../../utils/fecha.js'
import { IcoBuscar, IcoFlecha } from '../Iconos.jsx'

const LICENCIAS = [
  'GPL / AGPL',
  'LGPL',
  'MIT',
  'Apache 2.0',
  'BSD',
  'MPL',
  'Otra licencia libre',
  'Propietaria / mixta',
]

function Campo({ etiqueta, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
    </label>
  )
}

export default function StepSoftware({ software, onChange, onStart, onReabrir }) {
  const set = (campo) => (e) => onChange({ ...software, [campo]: e.target.value })
  const [recientes, setRecientes] = useState([])

  useEffect(() => {
    let vigente = true
    getHistorial().then(h => { if (vigente) setRecientes(h.slice(0, 6)) }).catch(() => {})
    return () => { vigente = false }
  }, [])

  const empezar = (e) => { e.preventDefault(); onStart() }
  const titulo = nombreEvaluacion(software)

  return (
    <div className="sw">
      <section className="hero">
        <span className="hero-paso">Paso 1 de 4</span>
        <h2 className="hero-titulo">¿Qué software evaluamos hoy?</h2>
        <form className="hero-buscar" onSubmit={empezar}>
          <IcoBuscar />
          <input
            className="hero-input"
            placeholder="Nombre del software: Moodle, Odoo, LibreOffice…"
            value={software.nombre}
            onChange={set('nombre')}
            autoFocus
            aria-label="Nombre del software"
          />
          <button type="submit" className="hero-boton">Comenzar <IcoFlecha /></button>
        </form>
        <p className="hero-nota">
          Puedes empezar solo con el nombre, o sin nada. Estos datos identifican qué se analizó:
          no intervienen en el cálculo.
        </p>
      </section>

      <form className="card sw-form" onSubmit={empezar}>
        <div className="sw-form-cab">
          <h3 className="sw-form-titulo">El producto y quién evalúa</h3>
          <span className="sw-form-nota">
            Todo opcional · Se guardará como <b className={titulo === 'Evaluación sin nombre' ? 'sw-preview-vacio' : ''}>{titulo}</b>
          </span>
        </div>

        <div className="sw-rejilla">
          <Campo etiqueta="Versión">
            <input className="field-input" placeholder="4.3" value={software.version} onChange={set('version')} />
          </Campo>
          <Campo etiqueta="Tipo de licencia">
            <select className="field-input" value={software.licencia} onChange={set('licencia')}>
              <option value="">Seleccione…</option>
              {LICENCIAS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Proveedor o comunidad">
            <input className="field-input" placeholder="Moodle HQ" value={software.proveedor} onChange={set('proveedor')} />
          </Campo>
          <Campo etiqueta="Organización">
            <input className="field-input" placeholder="Universidad Estatal de Milagro" value={software.organizacion} onChange={set('organizacion')} />
          </Campo>
          <Campo etiqueta="Evaluador">
            <input className="field-input" placeholder="Nombre del decisor" value={software.evaluador} onChange={set('evaluador')} />
          </Campo>
        </div>

        <div className="sw-acciones">
          <span className="sw-acciones-nota">Lo siguiente: ajustar la importancia de los 18 factores.</span>
          <button type="submit" className="btn btn-primary">Comenzar evaluación <IcoFlecha /></button>
        </div>
      </form>

      {recientes.length > 0 && (
        <section className="recientes">
          <h3 className="recientes-titulo">También podrías continuar con…</h3>
          <div className="recientes-fila">
            {recientes.map(ev => {
              const cod = ev.recomendacion_codigo
              return (
                <button
                  key={ev.id}
                  type="button"
                  className={`reciente ${REC_V[cod] || 'v-ninguno'}`}
                  onClick={() => onReabrir?.(ev.id)}
                  title="Reabrir esta evaluación para cambiar sus respuestas"
                >
                  <span className="reciente-miniatura">
                    <b>{cod || '–'}</b>
                    <small>{cod ? REC_CORTO[cod] : 'Sin veredicto'}</small>
                  </span>
                  <span className="reciente-nombre">{ev.nombre}</span>
                  <span className="reciente-fecha">{fechaCorta(ev.creado_en)}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
