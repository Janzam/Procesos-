// Etiquetas y clases de la recomendación y de la clasificación FODA.
// Viven aquí para que la tabla de resultados y el panel de análisis no tengan
// cada una su copia: si cambia una categoría, cambia en un solo sitio.

export const REC_LABEL = {
  A: 'Adoptar el software',
  B: 'Adoptar con reservas',
  C: 'No adoptar todavía',
}

export const REC_CLASS = { A: 'rec-banner-a', B: 'rec-banner-b', C: 'rec-banner-c' }
export const REC_BADGE = { A: 'rec-badge-a', B: 'rec-badge-b', C: 'rec-badge-c' }

// Las cuatro categorías de la matriz FODA. No hay más: la metodología clasifica
// todo factor relevante en una de ellas.
export const FODA_CLASS = {
  Fortaleza:   'badge-foda-fortaleza',
  Oportunidad: 'badge-foda-oportunidad',
  Debilidad:   'badge-foda-debilidad',
  Amenaza:     'badge-foda-amenaza',
}
