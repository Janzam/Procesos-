// Armazón de la aplicación: menú lateral, barra superior con el tema y la página
// activa. Las páginas se comunican con `navegar`, que admite abrir una evaluación
// para editarla (`editar`) o verla en el historial (`ver`).
import { useState, useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar.jsx'
import EvaluacionPage from './pages/EvaluacionPage.jsx'
import HistorialPage from './pages/HistorialPage.jsx'
import ImportarPage from './pages/ImportarPage.jsx'
import { IcoMenu, IcoSol, IcoLuna } from './components/Iconos.jsx'
import { getFunciones } from './api/guiosad.js'
// El panel se carga solo cuando se entra en él, no al abrir la aplicación.
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const LiteraturaPage = lazy(() => import('./pages/LiteraturaPage.jsx'))
const LiteraturaTablaPage = lazy(() => import('./pages/LiteraturaTablaPage.jsx'))

const PAGE_TITLES = {
  dashboard: 'Panel',
  evaluacion: 'Nueva evaluación',
  importar: 'Evaluar con plantilla',
  historial: 'Historial de evaluaciones',
  literatura: 'Importancia de la literatura',
  'literatura-tabla': 'Literatura IA › Tabla de resultados',
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
  // Resumen de una plantilla recién importada: qué entró y qué quedó fuera del cálculo.
  const [resumen, setResumen] = useState(null)
  // Cada «Nueva evaluación» (menú o panel) incrementa este contador para que la
  // página de evaluación empiece de cero en vez de recuperar el borrador anterior.
  const [reinicio, setReinicio] = useState(0)
  const [dark, setDark] = useState(leerTema)
  const [sidebar, setSidebar] = useState(leerSidebar)
  // Funciones opcionales del servidor. «Evaluar con plantilla» se puede
  // desactivar (PLANTILLA_HABILITADA=False) y entonces desaparece de la interfaz.
  const [plantilla, setPlantilla] = useState(true)

  useEffect(() => {
    getFunciones().then(f => setPlantilla(f.plantilla !== false)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!plantilla && page === 'importar') setPage('evaluacion')
  }, [plantilla, page])

  useEffect(() => {
    try { localStorage.setItem(PAGE_KEY, page) } catch { /* modo privado */ }
  }, [page])

  function navegar(destino, opciones) {
    setEditarId(opciones?.editar ?? null)
    setVerId(opciones?.ver ?? null)
    setResumen(opciones?.resumen ? { id: opciones.ver, ...opciones.resumen } : null)
    if (destino === 'evaluacion' && !opciones?.editar) setReinicio(n => n + 1)
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
      {sidebar && <Sidebar page={page} onNavigate={navegar} onHide={() => setSidebar(false)} ocultos={plantilla ? [] : ['importar']} />}
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
            {page === 'literatura' && <LiteraturaPage onNavigate={navegar} />}
            {page === 'literatura-tabla' && <LiteraturaTablaPage onNavigate={navegar} />}
          </Suspense>
          {page === 'evaluacion' && (
            <EvaluacionPage plantilla={plantilla} editarId={editarId} reinicio={reinicio} onFinEdicion={() => setEditarId(null)} onNavigate={navegar} />
          )}
          {page === 'importar' && plantilla && <ImportarPage onNavigate={navegar} />}
          {page === 'historial' && <HistorialPage onNavigate={navegar} verId={verId} resumenImportacion={resumen} />}
        </main>
      </div>
    </div>
  )
}
