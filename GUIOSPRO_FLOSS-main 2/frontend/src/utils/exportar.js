// origen: nuevo | exportación de resultados a PDF (jsPDF) y Excel (SheetJS) generada en el navegador
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

const REC_LABEL = { A: 'Adoptar el software', B: 'Adoptar con reservas', C: 'No adoptar todavía' }
const REC_RGB   = { A: [16, 185, 129], B: [245, 158, 11], C: [239, 68, 68] }
const FODA_CATS = ['Fortaleza', 'Oportunidad', 'Debilidad', 'Amenaza']
const FODA_PLURAL = { Fortaleza: 'Fortalezas', Oportunidad: 'Oportunidades', Debilidad: 'Debilidades', Amenaza: 'Amenazas' }

function nombreArchivo(nombre, ext) {
  const base = (nombre || 'evaluacion')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'evaluacion'
  const fecha = new Date().toISOString().slice(0, 10)
  return `GUIOSAD_${base}_${fecha}.${ext}`
}

function filasFactores(factores) {
  return factores.map(f => [
    f.factor_nombre,
    f.dimension,
    f.ir_etiqueta || '—',
    f.ponderacion_global !== null && f.ponderacion_global !== undefined ? f.ponderacion_global.toFixed(2) : '—',
    f.foda_categoria || '—',
  ])
}

function agruparFoda(factores) {
  const g = {}
  FODA_CATS.forEach(c => { g[c] = factores.filter(f => f.foda_categoria === c).map(f => f.factor_nombre) })
  return g
}

export function exportarPDF(nombre, resultado) {
  const { factores, recomendacion } = resultado
  const cod = recomendacion.codigo
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14

  // Encabezado
  doc.setFillColor(15, 118, 110)
  doc.rect(0, 0, W, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('GUIOSAD v2 — Informe de evaluación', M, 14)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(13)
  doc.text(nombre || 'Evaluación sin nombre', M, 32)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139)
  doc.text(`Generado el ${new Date().toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}`, M, 37.5)

  // Recomendación
  const [r, g, b] = REC_RGB[cod] || [71, 85, 105]
  doc.setFillColor(r, g, b)
  doc.circle(M + 6, 49, 6, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text(cod || '?', M + 6, 50.5, { align: 'center' })
  doc.setTextColor(15, 23, 42); doc.setFontSize(12)
  doc.text(`Recomendación ${cod} — ${REC_LABEL[cod] || 'Resultado'}`, M + 16, 47)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85)
  const texto = doc.splitTextToSize(recomendacion.texto || '', W - M * 2 - 16)
  doc.text(texto, M + 16, 52)
  let y = 52 + texto.length * 4.2 + 6

  // Tabla de factores
  autoTable(doc, {
    startY: y,
    head: [['Factor', 'Dimensión', 'Imp. relativa', 'Ponderación', 'FODA']],
    body: filasFactores(factores),
    margin: { left: M, right: M },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [15, 23, 42] },
    headStyles: { fillColor: [30, 41, 59], textColor: [241, 245, 249], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 62 }, 3: { halign: 'center' }, 4: { halign: 'center' } },
  })
  y = doc.lastAutoTable.finalY + 10

  // Resumen FODA
  const grupos = agruparFoda(factores)
  const maxLen = Math.max(...FODA_CATS.map(c => grupos[c].length), 1)
  const body = []
  for (let i = 0; i < maxLen; i++) body.push(FODA_CATS.map(c => grupos[c][i] || ''))

  if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42)
  doc.text('Diagrama FODA', M, y)
  autoTable(doc, {
    startY: y + 4,
    head: [FODA_CATS.map(c => `${FODA_PLURAL[c]} (${grupos[c].length})`)],
    body: body.length ? body : [['—', '—', '—', '—']],
    margin: { left: M, right: M },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [15, 23, 42] },
    headStyles: { textColor: [255, 255, 255], fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.section === 'head') {
        const colores = [[76, 175, 31], [58, 143, 217], [253, 174, 59], [156, 26, 158]]
        data.cell.styles.fillColor = colores[data.column.index]
      }
    },
  })

  // Pie de página
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8); doc.setTextColor(148, 163, 184)
    doc.text(`GUIOSAD v2 · ${nombre || 'Evaluación'} · Página ${i} de ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }

  doc.save(nombreArchivo(nombre, 'pdf'))
}

/* ── Excel (ExcelJS) ──────────────────────────────────────── */
const XL = {
  teal:      'FF0F766E',
  slate:     'FF1E293B',
  slateText: 'FF0F172A',
  gris:      'FF64748B',
  zebra:     'FFF8FAFC',
  borde:     'FFE2E8F0',
  blanco:    'FFFFFFFF',
  rec:  { A: 'FF10B981', B: 'FFF59E0B', C: 'FFEF4444' },
  foda: { Fortaleza: 'FF4CAF1F', Oportunidad: 'FF3A8FD9', Debilidad: 'FFFDAE3B', Amenaza: 'FF9C1A9E' },
  fodaSuave: { Fortaleza: 'FFE3F5DA', Oportunidad: 'FFDDEBFA', Debilidad: 'FFFFF0D9', Amenaza: 'FFF3DDF4' },
  ir: { Irrelevante: 'FFE2E8F0', Opcional: 'FFFEF3C7', Importante: 'FFDBEAFE', Fundamental: 'FFD1FAE5' },
}
const bordeFino = { style: 'thin', color: { argb: XL.borde } }
const BORDES = { top: bordeFino, left: bordeFino, bottom: bordeFino, right: bordeFino }

function fill(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb } } }

// Fila de cabecera de tabla: fondo oscuro, texto blanco, centrada
function estilarCabecera(row, altura = 22) {
  row.height = altura
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: XL.blanco }, size: 10.5 }
    cell.fill = fill(XL.slate)
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = BORDES
  })
}

// Bloque de título común a todas las hojas (filas 1-3)
function encabezadoHoja(ws, titulo, subtitulo, colFin) {
  ws.mergeCells(1, 1, 1, colFin)
  const t = ws.getCell(1, 1)
  t.value = titulo
  t.font = { bold: true, size: 15, color: { argb: XL.blanco } }
  t.fill = fill(XL.teal)
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 30

  ws.mergeCells(2, 1, 2, colFin)
  const s = ws.getCell(2, 1)
  s.value = subtitulo
  s.font = { italic: true, size: 9.5, color: { argb: XL.gris } }
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 18
  ws.getRow(3).height = 8
}

export async function exportarExcel(nombre, resultado) {
  const { factores, recomendacion } = resultado
  const cod = recomendacion.codigo
  const titulo = nombre || 'Evaluación sin nombre'
  const fecha = new Date().toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })
  const grupos = agruparFoda(factores)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'GUIOSAD v2'
  wb.created = new Date()

  /* Hoja 1 · Resumen */
  const wsR = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
  wsR.columns = [{ width: 3 }, { width: 24 }, { width: 80 }, { width: 3 }]
  encabezadoHoja(wsR, 'GUIOSAD v2 — Informe de evaluación', `Generado el ${fecha}`, 4)

  const filasResumen = [
    ['Evaluación', titulo],
    ['Fecha de exportación', fecha],
    ['Recomendación', `${cod} — ${REC_LABEL[cod] || ''}`],
    ['Detalle', recomendacion.texto || ''],
    ['Factores evaluados', factores.length],
    ['Factores relevantes', factores.filter(f => f.relevante).length],
  ]
  let r = 4
  filasResumen.forEach(([k, v]) => {
    const row = wsR.getRow(r)
    const ck = row.getCell(2), cv = row.getCell(3)
    ck.value = k; cv.value = v
    ck.font = { bold: true, size: 10.5, color: { argb: XL.slateText } }
    ck.fill = fill(XL.zebra)
    cv.font = { size: 10.5, color: { argb: XL.slateText } }
    ck.alignment = { vertical: 'top', indent: 1 }
    cv.alignment = { vertical: 'top', wrapText: true, indent: 1 }
    ck.border = BORDES; cv.border = BORDES
    if (k === 'Recomendación') {
      cv.font = { bold: true, size: 11, color: { argb: XL.blanco } }
      cv.fill = fill(XL.rec[cod] || XL.gris)
    }
    if (k === 'Detalle') row.height = 58
    r++
  })

  // Mini tabla FODA en el resumen
  r++
  const hdr = wsR.getRow(r)
  hdr.getCell(2).value = 'Categoría FODA'
  hdr.getCell(3).value = 'Nº de factores'
  hdr.height = 22
  ;[2, 3].forEach(c => {
    const cell = hdr.getCell(c)
    cell.font = { bold: true, color: { argb: XL.blanco }, size: 10.5 }
    cell.fill = fill(XL.slate)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = BORDES
  })
  r++
  FODA_CATS.forEach(c => {
    const row = wsR.getRow(r)
    row.getCell(2).value = FODA_PLURAL[c]
    row.getCell(3).value = grupos[c].length
    row.getCell(2).font = { bold: true, color: { argb: XL.blanco } }
    row.getCell(2).fill = fill(XL.foda[c])
    row.getCell(2).alignment = { indent: 1 }
    row.getCell(3).alignment = { horizontal: 'center' }
    row.getCell(2).border = BORDES; row.getCell(3).border = BORDES
    r++
  })

  /* Hoja 2 · Factores */
  const wsF = wb.addWorksheet('Factores', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  wsF.columns = [
    { width: 44 }, { width: 16 }, { width: 18 }, { width: 11 }, { width: 11 }, { width: 16 }, { width: 15 },
  ]
  encabezadoHoja(wsF, `Factores — ${titulo}`, 'Importancia relativa, ponderación global (1–4) y clasificación FODA por factor', 7)
  const cab = wsF.getRow(4)
  cab.values = ['Factor', 'Dimensión', 'Importancia relativa', 'Relevante', 'Alcance', 'Ponderación (1–4)', 'FODA']
  estilarCabecera(cab, 26)
  wsF.autoFilter = { from: 'A4', to: 'G4' }

  factores.forEach((f, i) => {
    const sinPond = f.ponderacion_global === null || f.ponderacion_global === undefined
    const row = wsF.addRow([
      f.factor_nombre, f.dimension, f.ir_etiqueta || '', f.relevante ? 'Sí' : 'No',
      f.alcance || '—', sinPond ? '—' : f.ponderacion_global, f.foda_categoria || '—',
    ])
    row.height = 18
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = BORDES
      cell.font = { size: 10, color: { argb: XL.slateText } }
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center', indent: col === 1 ? 1 : 0 }
      if (i % 2 === 1) cell.fill = fill(XL.zebra)
    })
    if (XL.ir[f.ir_etiqueta]) row.getCell(3).fill = fill(XL.ir[f.ir_etiqueta])
    const cP = row.getCell(6)
    if (!sinPond) {
      cP.numFmt = '0.00'
      cP.font = { size: 10, bold: true, color: { argb: f.ponderacion_global >= 3 ? 'FF047857' : 'FFB91C1C' } }
    }
    if (f.foda_categoria) {
      const cF = row.getCell(7)
      cF.fill = fill(XL.foda[f.foda_categoria])
      cF.font = { size: 10, bold: true, color: { argb: XL.blanco } }
    }
  })

  /* Hoja 3 · FODA */
  const wsD = wb.addWorksheet('FODA', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  wsD.columns = FODA_CATS.map(() => ({ width: 36 }))
  encabezadoHoja(wsD, `Diagrama FODA — ${titulo}`, 'Factores agrupados por categoría', 4)
  const cabD = wsD.getRow(4)
  cabD.values = FODA_CATS.map(c => `${FODA_PLURAL[c]} (${grupos[c].length})`)
  cabD.height = 26
  cabD.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: XL.blanco }, size: 11 }
    cell.fill = fill(XL.foda[FODA_CATS[col - 1]])
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = BORDES
  })
  const maxLen = Math.max(...FODA_CATS.map(c => grupos[c].length), 1)
  for (let i = 0; i < maxLen; i++) {
    const row = wsD.addRow(FODA_CATS.map(c => grupos[c][i] || ''))
    row.height = 18
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = BORDES
      cell.font = { size: 10, color: { argb: XL.slateText } }
      cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
      if (cell.value) cell.fill = fill(XL.fodaSuave[FODA_CATS[col - 1]])
    })
  }

  // Configuración de impresión para todas las hojas
  wb.eachSheet(ws => {
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
    ws.headerFooter.oddFooter = `&L GUIOSAD v2 · ${titulo} &R Página &P de &N`
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo(nombre, 'xlsx')
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

