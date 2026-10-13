// Carga diferida del módulo de exportación.
//
// jsPDF y ExcelJS pesan ~700 KB y no se necesitan al arrancar. Se precargan en
// cuanto una pantalla muestra botones de exportar: si el navegador tuviera que
// descargarlas durante el clic, perdería la activación transitoria del gesto y
// podría bloquear el archivo por considerar que la descarga no la pidió el usuario.
let modulo = null

export function precargarExportacion() {
  modulo = modulo || import('./exportar.js')
  return modulo
}

export async function exportarResultado(tipo, nombre, resultado) {
  const mod = await precargarExportacion()
  if (tipo === 'pdf') mod.exportarPDF(nombre, resultado)
  else await mod.exportarExcel(nombre, resultado)
}

// Todas las evaluaciones en un solo archivo: `evaluaciones` es el listado y
// `detalles` los resultados completos, en el mismo orden.
export async function exportarTodas(tipo, evaluaciones, detalles) {
  const mod = await precargarExportacion()
  if (tipo === 'pdf') mod.exportarTodasPDF(evaluaciones, detalles)
  else await mod.exportarTodasExcel(evaluaciones, detalles)
}
