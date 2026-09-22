// origen: nuevo | paso inicial: datos del software a evaluar (todos opcionales)
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

export const SOFTWARE_VACIO = {
  nombre: '',
  version: '',
  licencia: '',
  proveedor: '',
  organizacion: '',
  evaluador: '',
}

export default function StepSoftware({ software, onChange, onStart }) {
  const set = (campo) => (e) => onChange({ ...software, [campo]: e.target.value })

  return (
    <div className="card software-card">
      <div className="software-card-header">
        <span className="card-header-title" style={{ color: 'var(--text-primary)' }}>Software a evaluar</span>
        <span className="badge badge-optional">Opcional</span>
      </div>

      <form
        className="software-form"
        onSubmit={(e) => { e.preventDefault(); onStart() }}
      >
        <div className="software-grid">
          <label className="field">
            <span className="field-label">Nombre del software</span>
            <input
              className="field-input"
              placeholder="Ej. Moodle, Odoo, LibreOffice"
              value={software.nombre}
              onChange={set('nombre')}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Versión</span>
            <input
              className="field-input"
              placeholder="Ej. 4.3"
              value={software.version}
              onChange={set('version')}
            />
          </label>

          <label className="field">
            <span className="field-label">Tipo de licencia</span>
            <select className="field-input" value={software.licencia} onChange={set('licencia')}>
              <option value="">Seleccione…</option>
              {LICENCIAS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Proveedor / comunidad</span>
            <input
              className="field-input"
              placeholder="Ej. Moodle HQ"
              value={software.proveedor}
              onChange={set('proveedor')}
            />
          </label>

          <label className="field">
            <span className="field-label">Organización</span>
            <input
              className="field-input"
              placeholder="Ej. Universidad Estatal de Milagro"
              value={software.organizacion}
              onChange={set('organizacion')}
            />
          </label>

          <label className="field">
            <span className="field-label">Evaluador</span>
            <input
              className="field-input"
              placeholder="Nombre del decisor o evaluador"
              value={software.evaluador}
              onChange={set('evaluador')}
            />
          </label>
        </div>

        <div className="software-actions">
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
