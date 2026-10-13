// Los pasos del asistente como accesos circulares de color con su etiqueta
// debajo. El paso hecho muestra una marca, el activo se eleva con un halo y los
// pendientes quedan atenuados. Con `onIr` cada paso es un botón: se puede saltar
// directamente a cualquiera, lo que agiliza sobre todo la edición.
import { IcoSoftware, IcoFactores, IcoSubfactores, IcoResultados, IcoCheck } from './Iconos.jsx'

const ICONOS = [IcoSoftware, IcoFactores, IcoSubfactores, IcoResultados]
const TONOS = ['azul', 'morado', 'rosa', 'verde']

export default function Stepper({ steps, current, onIr, pistas = [], deshabilitado = false }) {
  // current: paso actual, empezando en 0
  return (
    <ol className="pasos" aria-label="Pasos de la evaluación">
      {steps.map((label, i) => {
        const estado = i < current ? 'hecho' : i === current ? 'activo' : 'pendiente'
        const Icono = ICONOS[i % ICONOS.length]
        const contenido = (
          <>
            <span className="paso-circulo">{estado === 'hecho' ? <IcoCheck /> : <Icono />}</span>
            <span className="paso-nombre">{label}</span>
          </>
        )
        return (
          <li
            key={label}
            className={`paso paso-${estado} paso-${TONOS[i % TONOS.length]}`}
            aria-current={estado === 'activo' ? 'step' : undefined}
          >
            {onIr ? (
              <button
                type="button"
                className="paso-boton"
                onClick={() => onIr(i)}
                disabled={deshabilitado || i === current}
                title={pistas[i] || `Ir a ${label}`}
              >
                {contenido}
              </button>
            ) : contenido}
          </li>
        )
      })}
    </ol>
  )
}
