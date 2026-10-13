// Fechas tal como se muestran en tarjetas y detalles.
export function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fechaLarga(iso) {
  return new Date(iso).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })
}
