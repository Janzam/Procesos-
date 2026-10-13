// Tarjeta flotante de una evaluación, como las de la referencia: icono de color
// con la letra del veredicto, título, organización y fecha, y un pie con el
// evaluador y la ponderación. Debajo, las acciones (ver, editar, PDF, Excel,
// eliminar) como botones circulares pequeños.
import { REC_V, REC_CORTO } from '../utils/recomendacion.js'
import { fechaCorta } from '../utils/fecha.js'
import { IcoOrganizacion, IcoFecha, IcoVer, IcoEditar, IcoBorrar, IcoPdf, IcoExcel } from './Iconos.jsx'

export function tituloDe(ev) {
  return ev.software_nombre ? [ev.software_nombre, ev.version].filter(Boolean).join(' ') : ev.nombre
}

// Dos iniciales a partir de las palabras que empiezan por letra o número; los
// signos sueltos («QA -Opps») no cuentan.
export function iniciales(nombre) {
  const letras = nombre.match(/[\p{L}\p{N}]+/gu) || []
  return letras.slice(0, 2).map(p => p[0]).join('').toUpperCase() || '–'
}

export function AccionesTarjeta({ ev, onVer, onEditar, onBorrar, onExportar, ocupado, borrando }) {
  const exportando = ocupado != null && ocupado.startsWith(`${ev.id}:`)
  return (
    <div className="tarjeta-acciones">
      <button className="tarjeta-accion" title="Ver resultado" aria-label="Ver resultado" onClick={() => onVer(ev)}><IcoVer /></button>
      <button className="tarjeta-accion" title="Editar respuestas" aria-label="Editar respuestas" onClick={() => onEditar(ev)}><IcoEditar /></button>
      <button className="tarjeta-accion tarjeta-accion-rojo" title="Exportar PDF" aria-label="Exportar PDF" disabled={exportando} onClick={() => onExportar('pdf', ev)}><IcoPdf /></button>
      <button className="tarjeta-accion tarjeta-accion-verde" title="Exportar Excel" aria-label="Exportar Excel" disabled={exportando} onClick={() => onExportar('excel', ev)}><IcoExcel /></button>
      <button className="tarjeta-accion tarjeta-accion-peligro" title="Eliminar" aria-label="Eliminar" disabled={borrando === ev.id} onClick={() => onBorrar(ev)}><IcoBorrar /></button>
    </div>
  )
}

export default function TarjetaEvaluacion(props) {
  const { ev, onVer } = props
  const cod = ev.recomendacion_codigo
  const pond = ev.ponderacion_media
  return (
    <article className={`tarjeta ${REC_V[cod] || 'v-ninguno'}`}>
      <button type="button" className="tarjeta-cuerpo" onClick={() => onVer(ev)}>
        <span className="tarjeta-icono" aria-hidden="true">{cod || '–'}</span>
        <span className="tarjeta-titulo">{tituloDe(ev)}</span>
        <span className="tarjeta-veredicto">{cod ? `${cod} · ${REC_CORTO[cod]}` : 'Sin veredicto'}</span>
        <span className="tarjeta-meta"><IcoOrganizacion />{ev.organizacion || 'Sin organización'}</span>
        <span className="tarjeta-meta"><IcoFecha />{fechaCorta(ev.creado_en)}</span>
        <span className="tarjeta-pie">
          <span className="tarjeta-dato">
            <span className="tarjeta-dato-etiqueta">Evaluador</span>
            <span className="tarjeta-persona">
              <span className="tarjeta-avatar">{ev.evaluador ? iniciales(ev.evaluador) : '–'}</span>
              <span className="tarjeta-persona-nombre">{ev.evaluador || 'Sin evaluador'}</span>
            </span>
          </span>
          <span className="tarjeta-dato tarjeta-dato-der">
            <span className="tarjeta-dato-etiqueta">Ponderación</span>
            <span className="tarjeta-progreso">
              <span className="tarjeta-progreso-pista"><span style={{ width: `${pond != null ? (pond / 4) * 100 : 0}%` }} /></span>
              <b>{pond != null ? pond.toFixed(2) : '—'}</b>
            </span>
          </span>
        </span>
      </button>
      <AccionesTarjeta {...props} />
    </article>
  )
}
