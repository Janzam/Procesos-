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

export function calcularIRLocal(importancia_sugerida, importancia_decisor) {
  // origen: main.py líneas 185-189 | cambio: ninguno, cálculo local para feedback inmediato
  const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']
  const r1 = importancia_sugerida - 1
  const r2 = importancia_decisor - 1
  const r = Math.floor((r1 + r2) / 2)
  return { indice: r, etiqueta: NIVELES[r], relevante: r > 0 }
}
