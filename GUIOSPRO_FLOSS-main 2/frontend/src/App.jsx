// origen: App.jsx original | cambio: layout con sidebar + topbar + toggle de tema claro/oscuro
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import EvaluacionPage from './pages/EvaluacionPage.jsx'
import HistorialPage from './pages/HistorialPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
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

const THEME_KEY = 'guiosad-theme'

// Lee el tema guardado; si no hay ninguno, oscuro por defecto
function leerTema() {
  try {
    return localStorage.getItem(THEME_KEY) !== 'light'
  } catch {
    return true
  }
}

const PAGE_KEY = 'guiosad-page'

function leerPagina() {
  try {
    const p = localStorage.getItem(PAGE_KEY)
    return p in PAGE_TITLES ? p : 'evaluacion'
  } catch {
    return 'evaluacion'
  }
}

const SIDEBAR_KEY = 'guiosad-sidebar'
function leerSidebar() {
  try { return localStorage.getItem(SIDEBAR_KEY) !== 'oculto' } catch { return true }
}

export default function App() {
  const [page, setPage]   = useState(leerPagina)
  const [dark, setDark]   = useState(leerTema)
  const [sidebar, setSidebar] = useState(leerSidebar)

  useEffect(() => {
    try { localStorage.setItem(PAGE_KEY, page) } catch { /* modo privado */ }
  }, [page])

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, sidebar ? 'visible' : 'oculto') } catch { /* modo privado */ }
  }, [sidebar])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light') } catch { /* modo privado */ }
  }, [dark])

  return (
    <div className={`layout${sidebar ? '' : ' layout-sin-sidebar'}`}>
      {sidebar && <Sidebar page={page} onNavigate={setPage} onHide={() => setSidebar(false)} />}
      <div className="layout-main">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebar && (
              <button className="theme-toggle" data-tip="Mostrar menú" onClick={() => setSidebar(true)} aria-label="Mostrar menú lateral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            )}
            <div className="topbar-breadcrumb">
              GUIOSAD v2 &nbsp;›&nbsp; <span>{PAGE_TITLES[page]}</span>
            </div>
          </div>
          <button
            className="theme-toggle"
            data-tip={dark ? 'Modo claro' : 'Modo oscuro'}
            onClick={() => setDark(!dark)}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
        <main className="layout-content">
          {page === 'dashboard'  && <DashboardPage onNavigate={setPage} />}
          {page === 'evaluacion' && <EvaluacionPage />}
          {page === 'historial'  && <HistorialPage  />}
        </main>
      </div>
    </div>
  )
}
