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

export async function actualizarEvaluacion(id, payload) {
  const res = await fetch(`${BASE}/evaluaciones/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al guardar los cambios')
  return res.json()
}

export async function eliminarEvaluacion(id) {
  const res = await fetch(`${BASE}/evaluaciones/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Error al eliminar la evaluación')
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

// ─────────────────────────────────────────────────────────────────────
// Análisis del resultado
//
// Las tres funciones leen el resultado que ya calculó la metodología y lo
// explican: qué factores lo causan, qué respuestas lo deciden y qué haría
// falta para mejorarlo. Ninguna recalcula nada con otra fórmula.
// ─────────────────────────────────────────────────────────────────────

async function pedir(url, mensajeError) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(mensajeError)
  return res.json()
}

export function getDiagnostico(id) {
  return pedir(`${BASE}/evaluaciones/${id}/diagnostico/`, 'Error al analizar el resultado')
}

export function getDeterminantes(id) {
  return pedir(`${BASE}/evaluaciones/${id}/determinantes/`, 'Error al calcular las respuestas determinantes')
}

export function getPlan(id) {
  return pedir(`${BASE}/evaluaciones/${id}/plan/`, 'Error al calcular el plan de mejora')
}

// ─────────────────────────────────────────────────────────────────────
// Asistencia con IA (RF-17, RF-18, RF-24)
//
// El asistente es opcional: si no hay credencial configurada, getEstadoIA
// devuelve disponible=false y la interfaz lo oculta. Nada de lo que hay aquí
// interviene en el cálculo.
// ─────────────────────────────────────────────────────────────────────

async function enviar(url, datos) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos || {}),
  })
  const cuerpo = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(cuerpo.detail || 'El asistente no está disponible')
  return cuerpo
}

export function getEstadoIA() {
  return pedir(`${BASE}/recomendaciones/ia/estado/`, 'Error al consultar el estado del asistente')
}

export function pedirSugerencias(factorId, software) {
  return enviar(`${BASE}/recomendaciones/ia/sugerencias/`, {
    factor_id: factorId,
    software_nombre: software?.nombre || '',
    version: software?.version || '',
    licencia: software?.licencia || '',
    proveedor: software?.proveedor || '',
  })
}

export function pedirInforme(id) {
  return enviar(`${BASE}/evaluaciones/${id}/informe/`)
}

export function pedirPlanNarrado(id) {
  return enviar(`${BASE}/evaluaciones/${id}/plan/`)
}
