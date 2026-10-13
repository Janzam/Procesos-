// Menú lateral claro, con el elemento activo como pastilla de color.
import { IcoPanel, IcoMas, IcoHistorial, IcoOcultar } from './Iconos.jsx'

const ITEMS = [
  { id: 'dashboard',  label: 'Panel',            Icono: IcoPanel },
  { id: 'evaluacion', label: 'Nueva evaluación', Icono: IcoMas },
  { id: 'historial',  label: 'Historial',        Icono: IcoHistorial },
]

export default function Sidebar({ page, onNavigate, onHide }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg className="sidebar-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="var(--brand)" fillOpacity="0.14"/>
          <path d="M7 14h4m0 0l3-5 3 8 3-5h3" stroke="var(--brand)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="sidebar-logo-text">GUIOSAD<span>v2</span></span>
        <button className="sidebar-hide" onClick={onHide} title="Ocultar menú lateral" aria-label="Ocultar menú lateral">
          <IcoOcultar />
        </button>
      </div>

      <nav className="sidebar-nav">
        {ITEMS.map(({ id, label, Icono }) => (
          <button
            key={id}
            className={`sidebar-item${page === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <span className="sidebar-item-icono"><Icono /></span>
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-pie">
        <span className="sidebar-pie-titulo">Metodología GUIOS</span>
        <span className="sidebar-pie-texto">3 dimensiones · 18 factores · 61 subfactores</span>
      </div>
    </aside>
  )
}
