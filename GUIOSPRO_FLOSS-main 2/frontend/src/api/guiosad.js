// origen: guiosad.py (get_suggested_importances, get_scopes) | cambio: datos ahora vienen del backend REST

const BASE = '/api'

export async function getFactores() {
  const res = await fetch(`${BASE}/factores/`)
  if (!res.ok) throw new Error('Error al cargar factores')
  return res.json()
}

export async function crearEvaluacion(payload) {
  const res = await fetch(`${BASE}/evaluaciones/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al guardar evaluación')
  return res.json()
}

export async function getHistorial() {
  const res = await fetch(`${BASE}/evaluaciones/`)
  if (!res.ok) throw new Error('Error al cargar historial')
  return res.json()
}

export async function getDashboard() {
  const res = await fetch(`${BASE}/evaluaciones/dashboard/`)
  if (!res.ok) throw new Error('Error al cargar el dashboard')
  return res.json()
}

export async function getEvaluacion(id) {
  const res = await fetch(`${BASE}/evaluaciones/${id}/`)
  if (!res.ok) throw new Error('Error al cargar evaluación')
  return res.json()
}

export async function getMatrizIR() {
  const res = await fetch(`${BASE}/recomendaciones/matriz-ir/`)
  if (!res.ok) throw new Error('Error al cargar la matriz de importancia relativa')
  return res.json()
}

// La fórmula de Importancia Relativa vive SOLO en el backend
// (recomendaciones/services.py). Aquí únicamente se consulta la matriz 4x4 que
// envía /api/recomendaciones/matriz-ir/, para que no puedan divergir.
const IR_DESCONOCIDA = { indice: 0, etiqueta: '—', relevante: false }

export function calcularIR(matrizIR, importancia_sugerida, importancia_decisor) {
  const fila = matrizIR?.[importancia_sugerida - 1]
  return fila?.[importancia_decisor - 1] ?? IR_DESCONOCIDA
}
