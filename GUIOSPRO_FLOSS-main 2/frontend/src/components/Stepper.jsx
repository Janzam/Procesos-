// Los pasos del asistente como accesos circulares de color con su etiqueta
// debajo, al estilo de la referencia. El paso hecho muestra una marca, el activo
// se eleva con un halo y los pendientes quedan atenuados.
import { IcoSoftware, IcoFactores, IcoSubfactores, IcoResultados, IcoCheck } from './Iconos.jsx'

const ICONOS = [IcoSoftware, IcoFactores, IcoSubfactores, IcoResultados]
const TONOS = ['azul', 'morado', 'rosa', 'verde']

export default function Stepper({ steps, current }) {
  // current: paso actual, empezando en 0
  return (
    <ol className="pasos" aria-label="Pasos de la evaluación">
      {steps.map((label, i) => {
        const estado = i < current ? 'hecho' : i === current ? 'activo' : 'pendiente'
        const Icono = ICONOS[i % ICONOS.length]
        return (
          <li
            key={label}
            className={`paso paso-${estado} paso-${TONOS[i % TONOS.length]}`}
            aria-current={estado === 'activo' ? 'step' : undefined}
          >
            <span className="paso-circulo">{estado === 'hecho' ? <IcoCheck /> : <Icono />}</span>
            <span className="paso-nombre">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
