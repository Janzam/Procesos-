// Armazón de la aplicación: menú lateral, barra superior con el tema y la página
// activa. Las páginas se comunican con `navegar`, que admite abrir una evaluación
// para editarla (`editar`) o verla en el historial (`ver`).
import { useState, useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar.jsx'
import EvaluacionPage from './pages/EvaluacionPage.jsx'
import HistorialPage from './pages/HistorialPage.jsx'
import { IcoMenu, IcoSol, IcoLuna } from './components/Iconos.jsx'
// El panel se carga solo cuando se entra en él, no al abrir la aplicación.
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))

const PAGE_TITLES = {
  dashboard: 'Panel',
  evaluacion: 'Nueva evaluación',
  historial: 'Historial de evaluaciones',
}

// Tema: claro por defecto; el oscuro se recuerda si se eligió.
const THEME_KEY = 'guiosad-theme'
function leerTema() {
  try { return localStorage.getItem(THEME_KEY) === 'dark' } catch { return false }
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
  const [page, setPage] = useState(leerPagina)
  // Evaluación que se está editando o viendo, si se llegó desde otra pantalla.
  const [editarId, setEditarId] = useState(null)
  const [verId, setVerId] = useState(null)
  const [dark, setDark] = useState(leerTema)
  const [sidebar, setSidebar] = useState(leerSidebar)

  useEffect(() => {
    try { localStorage.setItem(PAGE_KEY, page) } catch { /* modo privado */ }
  }, [page])

  function navegar(destino, opciones) {
    setEditarId(opciones?.editar ?? null)
    setVerId(opciones?.ver ?? null)
    setPage(destino)
  }

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, sidebar ? 'visible' : 'oculto') } catch { /* modo privado */ }
  }, [sidebar])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light') } catch { /* modo privado */ }
  }, [dark])

  return (
    <div className={`layout${sidebar ? '' : ' layout-sin-sidebar'}`}>
      {sidebar && <Sidebar page={page} onNavigate={navegar} onHide={() => setSidebar(false)} />}
      <div className="layout-main">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebar && (
              <button className="theme-toggle" data-tip="Mostrar menú" onClick={() => setSidebar(true)} aria-label="Mostrar menú lateral">
                <IcoMenu />
              </button>
            )}
            <div className="topbar-breadcrumb">
              GUIOSAD v2 <span className="topbar-sep">›</span> <span>{PAGE_TITLES[page]}</span>
            </div>
          </div>
          <button
            className="theme-toggle"
            data-tip={dark ? 'Modo claro' : 'Modo oscuro'}
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {dark ? <IcoSol /> : <IcoLuna />}
          </button>
        </header>
        <main className="layout-content">
          <Suspense fallback={<p className="an-vacio">Cargando…</p>}>
            {page === 'dashboard' && <DashboardPage onNavigate={navegar} />}
          </Suspense>
          {page === 'evaluacion' && (
            <EvaluacionPage editarId={editarId} onFinEdicion={() => setEditarId(null)} onNavigate={navegar} />
          )}
          {page === 'historial' && <HistorialPage onNavigate={navegar} verId={verId} />}
        </main>
      </div>
    </div>
  )
}
