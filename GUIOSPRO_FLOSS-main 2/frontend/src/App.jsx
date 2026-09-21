// origen: App.jsx original | cambio: layout con sidebar + topbar + toggle de tema claro/oscuro
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import EvaluacionPage from './pages/EvaluacionPage.jsx'
import HistorialPage from './pages/HistorialPage.jsx'

const PAGE_TITLES = {
  evaluacion: 'Nueva Evaluación',
  historial: 'Historial de evaluaciones',
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  )
}

export default function App() {
  const [page, setPage]   = useState('evaluacion')
  const [dark, setDark]   = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="layout">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="layout-main">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            GUIOSAD v2 &nbsp;›&nbsp; <span>{PAGE_TITLES[page]}</span>
          </div>
          <button className="theme-toggle" onClick={() => setDark(!dark)}>
            {dark ? <SunIcon /> : <MoonIcon />}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </header>
        <main className="layout-content">
          {page === 'evaluacion' && <EvaluacionPage />}
          {page === 'historial'  && <HistorialPage  />}
        </main>
      </div>
    </div>
  )
}
