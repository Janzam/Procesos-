// Botones de exportación al estilo de los accesos de la referencia: un icono en
// un círculo de color y la etiqueta debajo. Los usan la pantalla de resultados y
// el detalle del historial; las tarjetas llevan una versión compacta propia.
import { IcoPdf, IcoExcel } from './Iconos.jsx'

const ACCIONES = [
  { tipo: 'pdf',   corta: 'PDF',   larga: 'Exportar PDF',   tono: 'rojo',  Icono: IcoPdf },
  { tipo: 'excel', corta: 'Excel', larga: 'Exportar Excel', tono: 'verde', Icono: IcoExcel },
]

// `ocupado` es el tipo que se está preparando (o null): se deshabilitan los dos
// mientras tanto para no lanzar dos descargas a la vez.
export default function AccionesExportar({ onExportar, ocupado = null, titulo }) {
  return (
    <div className="acciones">
      {titulo && <span className="acciones-titulo">{titulo}</span>}
      <div className="acciones-fila">
        {ACCIONES.map(({ tipo, corta, larga, tono, Icono }) => (
          <button
            key={tipo}
            type="button"
            className={`accion accion-${tono}`}
            onClick={() => onExportar(tipo)}
            disabled={Boolean(ocupado)}
            title={larga}
            aria-label={larga}
          >
            <span className="accion-circulo"><Icono /></span>
            <span className="accion-etiqueta">{ocupado === tipo ? 'Preparando…' : corta}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
