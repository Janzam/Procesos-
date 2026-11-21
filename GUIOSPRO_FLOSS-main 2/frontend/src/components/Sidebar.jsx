// Menú lateral: marca, navegación con un icono en losange de color por entrada
// y, al pie, una tarjeta con la metodología en la que se basa el sistema.
import { IcoPanel, IcoNuevaEval, IcoHistorial, IcoOcultar, IcoCapas, IcoBuscar, IcoSubir, IcoTabla } from './Iconos.jsx'

const ITEMS = [
  { id: 'dashboard',  label: 'Panel',            desc: 'Resumen y evaluaciones', tono: 'azul',   Icono: IcoPanel },
  { id: 'evaluacion', label: 'Nueva evaluación', desc: 'Asistente de 4 pasos',   tono: 'verde',  Icono: IcoNuevaEval },
  { id: 'importar',   label: 'Evaluar con plantilla', desc: 'Suba su archivo Excel', tono: 'turquesa', Icono: IcoSubir },
  { id: 'historial',  label: 'Historial',        desc: 'Resultados guardados',   tono: 'morado', Icono: IcoHistorial },
  { id: 'literatura', label: 'Literatura IA',    desc: 'Importancia sugerida',   tono: 'naranja', Icono: IcoBuscar,
    hijos: [{ id: 'literatura-tabla', label: 'Tabla de resultados', Icono: IcoTabla }] },
]

export default function Sidebar({ page, onNavigate, onHide, ocultos = [] }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-marca" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h4l3-6 3 9 3-6h3"/>
          </svg>
        </span>
        <span className="sidebar-logo-text">GUIOSAD</span>
        <span className="sidebar-version">v2</span>
        <button className="sidebar-hide" onClick={onHide} title="Ocultar menú lateral" aria-label="Ocultar menú lateral">
          <IcoOcultar />
        </button>
      </div>

      <span className="sidebar-seccion">Navegación</span>
      <nav className="sidebar-nav">
        {ITEMS.filter(({ id }) => !ocultos.includes(id)).map(({ id, label, desc, tono, Icono, hijos }) => (
          <div key={id} className="sidebar-grupo">
            <button
              className={`sidebar-item sidebar-${tono}${page === id ? ' active' : ''}`}
              onClick={() => onNavigate(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <span className="sidebar-item-icono"><Icono /></span>
              <span className="sidebar-item-texto">
                <span className="sidebar-item-nombre">{label}</span>
                <span className="sidebar-item-desc">{desc}</span>
              </span>
            </button>
            {hijos?.map(h => (
              <button
                key={h.id}
                className={`sidebar-subitem sidebar-${tono}${page === h.id ? ' active' : ''}`}
                onClick={() => onNavigate(h.id)}
                aria-current={page === h.id ? 'page' : undefined}
              >
                <span className="sidebar-subitem-icono"><h.Icono /></span>
                <span>{h.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-pie">
        <div className="acerca">
          <div className="acerca-cab">
            <span className="acerca-icono"><IcoCapas /></span>
            <span className="acerca-texto">
              <span className="acerca-titulo">Metodología GUIOS</span>
              <span className="acerca-sub">Rea Sánchez, 2022</span>
            </span>
          </div>
          <ul className="acerca-cifras">
            <li><b>3</b><span>dimensiones</span></li>
            <li><b>18</b><span>factores</span></li>
            <li><b>61</b><span>subfactores</span></li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
