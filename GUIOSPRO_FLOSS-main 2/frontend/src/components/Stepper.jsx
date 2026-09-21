// origen: nuevo | stepper visual de 3 pasos con estado activo/completado/pendiente
const CHECK = (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="3,8 6.5,12 13,4"/>
  </svg>
)

export default function Stepper({ steps, current }) {
  // current: 0-indexed step
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending'
        return (
          <div key={i} className="stepper-step" style={{ flex: i < steps.length - 1 ? 1 : 'unset', display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <div className={`stepper-circle ${state}`}>
              {state === 'done' ? CHECK : i + 1}
            </div>
            <span className={`stepper-label ${state}`} style={{ marginLeft: 8 }}>{label}</span>
            {i < steps.length - 1 && (
              <div className={`stepper-line ${state === 'done' ? 'done' : 'pending'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
