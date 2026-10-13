// Gráfica de dona en SVG, sin librerías: porciones de color, cifra en el centro y
// cada etiqueta unida a su porción por una línea guía que termina en un punto.
//
// datos: [{ etiqueta, valor, color }]. Las porciones a cero no se dibujan pero sí
// aparecen en la leyenda, para que se vea que la categoría existe.

// Ancho sobrado a cada lado para que las etiquetas más largas no se recorten.
const W = 580
const H = 300
const CX = 290
const CY = 150
const R = 96      // radio exterior
const RI = 60     // radio interior
const SALIDA = 30 // longitud del primer tramo de la guía
const CODO = 26   // tramo horizontal hasta el punto

function punto(ang, radio) {
  return [CX + radio * Math.cos(ang), CY + radio * Math.sin(ang)]
}

function arco(a0, a1) {
  const grande = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = punto(a0, R)
  const [x1, y1] = punto(a1, R)
  const [xi0, yi0] = punto(a1, RI)
  const [xi1, yi1] = punto(a0, RI)
  return `M${x0} ${y0} A${R} ${R} 0 ${grande} 1 ${x1} ${y1} L${xi0} ${yi0} A${RI} ${RI} 0 ${grande} 0 ${xi1} ${yi1} Z`
}

// Reparte las etiquetas de cada lado para que no se pisen entre sí.
function separar(etiquetas, minimo = 20) {
  for (const lado of [-1, 1]) {
    const grupo = etiquetas.filter(e => e.lado === lado).sort((a, b) => a.y - b.y)
    for (let i = 1; i < grupo.length; i++) {
      if (grupo[i].y - grupo[i - 1].y < minimo) grupo[i].y = grupo[i - 1].y + minimo
    }
  }
  return etiquetas
}

export default function Donut({ datos, centroValor, centroEtiqueta }) {
  const total = datos.reduce((s, d) => s + d.valor, 0)
  const porciones = []
  let ang = -Math.PI / 2
  for (const d of datos) {
    if (!d.valor) continue
    const a1 = ang + (d.valor / total) * 2 * Math.PI
    porciones.push({ ...d, a0: ang, a1, medio: (ang + a1) / 2 })
    ang = a1
  }

  const etiquetas = separar(porciones.map(p => {
    const lado = Math.cos(p.medio) >= 0 ? 1 : -1
    const [x1, y1] = punto(p.medio, R + 4)
    const [x2, y2] = punto(p.medio, R + SALIDA)
    return { ...p, lado, x1, y1, x2, y2, x: x2 + lado * CODO, y: y2 }
  }))

  return (
    <svg className="dona" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label={datos.map(d => `${d.etiqueta}: ${d.valor}`).join('. ')}>
      {total === 0 && (
        <circle cx={CX} cy={CY} r={(R + RI) / 2} fill="none" stroke="var(--track)" strokeWidth={R - RI} />
      )}
      {porciones.length === 1 && (
        <circle cx={CX} cy={CY} r={(R + RI) / 2} fill="none" stroke={porciones[0].color} strokeWidth={R - RI} />
      )}
      {porciones.length > 1 && porciones.map(p => (
        <path key={p.etiqueta} d={arco(p.a0, p.a1)} fill={p.color} stroke="var(--bg-card)" strokeWidth="2" />
      ))}

      <text x={CX} y={CY - 4} textAnchor="middle" className="dona-centro-valor">{centroValor}</text>
      <text x={CX} y={CY + 16} textAnchor="middle" className="dona-centro-etiqueta">{centroEtiqueta}</text>

      {etiquetas.map(e => (
        <g key={e.etiqueta} className="dona-guia">
          <polyline points={`${e.x1},${e.y1} ${e.x2},${e.y2} ${e.x},${e.y}`} fill="none" stroke={e.color} strokeWidth="1.5" />
          <circle cx={e.x} cy={e.y} r="4" fill="var(--bg-card)" stroke={e.color} strokeWidth="2" />
          <text x={e.x + e.lado * 9} y={e.y + 4} textAnchor={e.lado > 0 ? 'start' : 'end'} className="dona-etiqueta">
            {e.etiqueta} <tspan className="dona-etiqueta-valor">{e.valor}</tspan>
          </text>
        </g>
      ))}
    </svg>
  )
}
