// Paso inicial: datos del software a evaluar (todos opcionales).
import { nombreCorto, nombreEvaluacion } from '../../utils/software.js'

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

export default function StepSoftware({ software, onChange, onStart }) {
  const set = (campo) => (e) => onChange({ ...software, [campo]: e.target.value })

  // El mismo nombre que llevará la evaluación en el historial. Se muestra
  // mientras se escribe para que no haya sorpresas después.
  const base = nombreCorto(software)
  const titulo = nombreEvaluacion(software)

  return (
    <div className="sw-layout">
      <aside className="sw-intro">
        <span className="sw-paso">Paso 1 de 4</span>
        <h2 className="sw-titulo">¿Qué software vas a evaluar?</h2>
        <p className="sw-texto">
          Nada de esto interviene en el cálculo: sirve para que el informe identifique sin
          ambigüedad qué se analizó y para poder encontrarlo después en el historial.
        </p>
        <p className="sw-texto">
          Puedes dejarlo todo en blanco y empezar directamente.
        </p>
        <div className="sw-preview">
          <span className="sw-preview-etiqueta">Se guardará como</span>
          <span className={`sw-preview-valor${base ? '' : ' sw-preview-vacio'}`}>{titulo}</span>
        </div>
      </aside>

      <form className="sw-form" onSubmit={(e) => { e.preventDefault(); onStart() }}>
        <fieldset className="sw-grupo">
          <legend className="sw-grupo-titulo">El producto</legend>
          <div className="sw-rejilla">
            <Campo etiqueta="Nombre del software">
              <input
                className="field-input"
                placeholder="Moodle, Odoo, LibreOffice…"
                value={software.nombre}
                onChange={set('nombre')}
                autoFocus
              />
            </Campo>
            <Campo etiqueta="Versión">
              <input
                className="field-input"
                placeholder="4.3"
                value={software.version}
                onChange={set('version')}
              />
            </Campo>
            <Campo etiqueta="Tipo de licencia">
              <select className="field-input" value={software.licencia} onChange={set('licencia')}>
                <option value="">Seleccione…</option>
                {LICENCIAS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Proveedor o comunidad">
              <input
                className="field-input"
                placeholder="Moodle HQ"
                value={software.proveedor}
                onChange={set('proveedor')}
              />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="sw-grupo">
          <legend className="sw-grupo-titulo">Quién evalúa</legend>
          <div className="sw-rejilla">
            <Campo etiqueta="Organización">
              <input
                className="field-input"
                placeholder="Universidad Estatal de Milagro"
                value={software.organizacion}
                onChange={set('organizacion')}
              />
            </Campo>
            <Campo etiqueta="Evaluador">
              <input
                className="field-input"
                placeholder="Nombre del decisor"
                value={software.evaluador}
                onChange={set('evaluador')}
              />
            </Campo>
          </div>
        </fieldset>

        <div className="sw-acciones">
          <span className="sw-acciones-nota">Lo siguiente: ajustar la importancia de los 18 factores.</span>
          <button type="submit" className="btn btn-primary">
            Comenzar evaluación
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="9,6 15,12 9,18"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
