// origen: App.jsx original | cambio: layout con sidebar + topbar + routing interno
import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import EvaluacionPage from './pages/EvaluacionPage.jsx'
import HistorialPage from './pages/HistorialPage.jsx'

const PAGE_TITLES = {
  evaluacion: 'Nueva Evaluación',
  historial: 'Historial de evaluaciones',
}

export default function App() {
  const [page, setPage] = useState('evaluacion')

  return (
    <div className="layout">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="layout-main">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            GUIOSAD v2 &nbsp;›&nbsp; <span>{PAGE_TITLES[page]}</span>
          </div>
        </header>
        <main className="layout-content">
          {page === 'evaluacion' && <EvaluacionPage />}
          {page === 'historial'  && <HistorialPage  />}
        </main>
      </div>
    </div>
  )
}
