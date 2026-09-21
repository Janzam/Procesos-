// origen: nuevo | diseño moderno con sidebar y navegación SPA
export default function Sidebar({ page, onNavigate }) {
  const items = [
    {
      id: 'evaluacion', label: 'Nueva Evaluación',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4"/></svg>
    },
    {
      id: 'historial', label: 'Historial',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg className="sidebar-icon" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="#14b8a6" fillOpacity="0.15"/>
          <path d="M7 14h4m0 0l3-5 3 8 3-5h3" stroke="#14b8a6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="sidebar-logo-text">GUIOSAD<span>v2</span></span>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`sidebar-item${page === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">U</div>
        <span className="sidebar-username">Decisor</span>
      </div>
    </aside>
  )
}
