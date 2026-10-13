// Panel: cabecera con acceso a una evaluación nueva, resumen con fichas de icono
// y gráfica de dona (GET /api/evaluaciones/dashboard/) y, debajo, el historial
// como tarjetas flotantes con pestañas por veredicto (GET /api/evaluaciones/).
import { useState, useEffect } from 'react'
import { getDashboard, getHistorial } from '../api/guiosad.js'
import Donut from '../components/Donut.jsx'
import ListaEvaluaciones from '../components/ListaEvaluaciones.jsx'
import {
  IcoMas, IcoCarpeta, IcoPulgar, IcoAlerta, IcoPausa, IcoMedidor, IcoFactores, IcoCapas, IcoResultados,
} from '../components/Iconos.jsx'

const FODA = [
  { clave: 'Fortaleza',   etiqueta: 'Fortalezas',    color: 'var(--foda-f)' },
  { clave: 'Oportunidad', etiqueta: 'Oportunidades', color: 'var(--foda-o)' },
  { clave: 'Debilidad',   etiqueta: 'Debilidades',   color: 'var(--foda-d)' },
  { clave: 'Amenaza',     etiqueta: 'Amenazas',      color: 'var(--foda-a)' },
]

// El detalle de cada cifra se muestra como texto emergente, no debajo: la ficha
// queda con el icono, la etiqueta y el número.
function Ficha({ etiqueta, valor, pie, tono, Icono, texto }) {
  return (
    <li className={`ficha ficha-${tono}${texto ? ' ficha-texto' : ''}`} title={pie ? `${etiqueta}: ${valor} · ${pie}` : undefined}>
      <span className="ficha-icono"><Icono /></span>
      <span className="ficha-etiqueta">{etiqueta}</span>
      <span className={`ficha-valor chip chip-${tono}`}>{valor}</span>
    </li>
  )
}

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [historial, setHistorial] = useState([])
  const [error, setError] = useState(null)

  function cargar() {
    return Promise.all([getDashboard(), getHistorial()])
      .then(([d, h]) => { setData(d); setHistorial(h) })
      .catch(() => setError('No se pudo cargar el panel. Verifique que el backend esté en ejecución.'))
  }
  useEffect(() => { cargar() }, [])

  if (error && !data) return <div className="error-msg">{error}</div>
  if (!data) return <p className="an-vacio">Cargando el panel…</p>

  const total = data.total_evaluaciones
  const nueva = () => onNavigate('evaluacion')

  if (total === 0) {
    return (
      <div className="dash">
        <header className="pagina-cab">
          <div>
            <h1 className="page-title">Panel</h1>
            <p className="page-subtitle">Resumen de las evaluaciones realizadas.</p>
          </div>
        </header>
        <div className="empty-state card">
          <IcoResultados />
          <p>Todavía no hay evaluaciones. Cree la primera para ver el resumen aquí.</p>
          <button className="btn btn-primary" onClick={nueva}><IcoMas /> Nueva evaluación</button>
        </div>
      </div>
    )
  }

  const rec = data.recomendaciones
  const pond = data.ponderacion_promedio
  const topProblema = data.problemas_frecuentes[0]
  const dimDebil = [...data.ponderacion_por_dimension].sort((a, b) => a.ponderacion - b.ponderacion)[0]
  const clasificados = FODA.reduce((s, f) => s + (data.foda[f.clave] || 0), 0)

  const fichas = [
    { etiqueta: 'Evaluaciones', valor: total, pie: 'guardadas', tono: 'azul', Icono: IcoCarpeta },
    { etiqueta: 'Adoptar', valor: rec.A, pie: 'recomendación A', tono: 'verde', Icono: IcoPulgar },
    { etiqueta: 'Con reservas', valor: rec.B, pie: 'recomendación B', tono: 'ambar', Icono: IcoAlerta },
    { etiqueta: 'No adoptar', valor: rec.C, pie: 'recomendación C', tono: 'rojo', Icono: IcoPausa },
    { etiqueta: 'Ponderación media', valor: pond !== null ? pond.toFixed(2) : '—', pie: 'sobre 4 · umbral 3,0', tono: 'morado', Icono: IcoMedidor },
    { etiqueta: 'Factores relevantes', valor: data.factores_relevantes_promedio, pie: 'de media por evaluación', tono: 'turquesa', Icono: IcoFactores },
    { etiqueta: 'Factor que más falla', valor: topProblema ? topProblema.factor_nombre : '—',
      pie: topProblema ? `${topProblema.veces} de ${total} evaluaciones` : 'sin factores desfavorables', tono: 'naranja', Icono: IcoAlerta, texto: true },
    { etiqueta: 'Dimensión más débil', valor: dimDebil ? dimDebil.dimension : '—',
      pie: dimDebil ? `ponderación ${dimDebil.ponderacion.toFixed(2)} / 4` : '', tono: 'rosa', Icono: IcoCapas, texto: true },
  ]

  return (
    <div className="dash">
      <header className="pagina-cab">
        <div>
          <h1 className="page-title">Panel</h1>
          <p className="page-subtitle">Resumen de las {total} evaluaciones guardadas.</p>
        </div>
        <button className="btn btn-primary" onClick={nueva}><IcoMas /> Nueva evaluación</button>
      </header>

      {error && <div className="error-msg">{error}</div>}

      <section className="card resumen">
        <div className="resumen-fichas">
          <header className="resumen-cab">
            <h3 className="chip chip-azul">Resumen</h3>
            <span>{total} evaluaciones · {clasificados} factores clasificados</span>
          </header>
          <ul className="fichas">
            {fichas.map(f => <Ficha key={f.etiqueta} {...f} />)}
          </ul>
        </div>
        <div className="resumen-dona">
          <header className="resumen-cab">
            <h3 className="chip chip-morado">Clasificación FODA</h3>
            <span>de todos los factores evaluados</span>
          </header>
          <Donut
            datos={FODA.map(f => ({ etiqueta: f.etiqueta, valor: data.foda[f.clave] || 0, color: f.color }))}
            centroValor={clasificados}
            centroEtiqueta="factores"
          />
        </div>
      </section>

      <section className="seccion">
        <header className="seccion-cab">
          <h2 className="seccion-titulo">Evaluaciones</h2>
          <button className="btn btn-outline btn-xs" onClick={() => onNavigate('historial')}>Abrir historial</button>
        </header>
        <ListaEvaluaciones
          evaluaciones={historial}
          onVer={ev => onNavigate('historial', { ver: ev.id })}
          onEditar={ev => onNavigate('evaluacion', { editar: ev.id })}
          onBorrada={() => cargar()}
          onError={setError}
        />
      </section>
    </div>
  )
}
