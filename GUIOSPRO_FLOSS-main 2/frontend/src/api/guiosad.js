// origen: guiosad.py (get_suggested_importances, get_scopes) | cambio: datos ahora vienen del backend REST
import { SOFTWARE_VACIO, softwareAPayload } from '../utils/software.js'

const BASE = '/api'

// Una petición a la API. Un fallo HTTP se convierte en un Error con el mensaje
// indicado; una respuesta sin cuerpo (204) devuelve undefined.
async function pedir(ruta, mensajeError, opciones) {
  const res = await fetch(`${BASE}${ruta}`, opciones)
  if (!res.ok) throw new Error(mensajeError)
  return res.status === 204 ? undefined : res.json()
}

function conCuerpo(method, datos) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  }
}

export function getFactores() {
  return pedir('/factores/', 'Error al cargar factores')
}

export function crearEvaluacion(payload) {
  return pedir('/evaluaciones/', 'Error al guardar evaluación', conCuerpo('POST', payload))
}

export function actualizarEvaluacion(id, payload) {
  return pedir(`/evaluaciones/${id}/`, 'Error al guardar los cambios', conCuerpo('PUT', payload))
}

export function eliminarEvaluacion(id) {
  return pedir(`/evaluaciones/${id}/`, 'Error al eliminar la evaluación', { method: 'DELETE' })
}

export function getHistorial() {
  return pedir('/evaluaciones/', 'Error al cargar historial')
}

export function getDashboard() {
  return pedir('/evaluaciones/dashboard/', 'Error al cargar el dashboard')
}

export function getEvaluacion(id) {
  return pedir(`/evaluaciones/${id}/`, 'Error al cargar evaluación')
}

export function getMatrizIR() {
  return pedir('/recomendaciones/matriz-ir/', 'Error al cargar la matriz de importancia relativa')
}

// La fórmula de Importancia Relativa vive SOLO en el backend
// (recomendaciones/services.py). Aquí únicamente se consulta la matriz 4x4 que
// envía /api/recomendaciones/matriz-ir/, para que no puedan divergir.
const IR_DESCONOCIDA = { indice: 0, etiqueta: '—', relevante: false }

export function calcularIR(matrizIR, importancia_sugerida, importancia_decisor) {
  const fila = matrizIR?.[importancia_sugerida - 1]
  return fila?.[importancia_decisor - 1] ?? IR_DESCONOCIDA
}

// Misma regla de relevancia que aplica el backend: un factor que el decisor no
// tocó se evalúa igualmente con importancia 1.
export function esRelevante(factor, evaluacionFactores, matrizIR) {
  const id = evaluacionFactores[factor.id]?.importancia_decisor ?? 1
  return calcularIR(matrizIR, factor.importancia_sugerida, id).relevante
}

// ─────────────────────────────────────────────────────────────────────
// Análisis del resultado
//
// Leen el resultado que ya calculó la metodología y lo explican: qué
// factores lo causan y qué respuestas lo deciden. Ninguna recalcula nada
// con otra fórmula. El plan de mejora se pide con pedirPlanNarrado().
// ─────────────────────────────────────────────────────────────────────

export function getDiagnostico(id) {
  return pedir(`/evaluaciones/${id}/diagnostico/`, 'Error al analizar el resultado')
}

export function getDeterminantes(id) {
  return pedir(`/evaluaciones/${id}/determinantes/`, 'Error al calcular las respuestas determinantes')
}

// ─────────────────────────────────────────────────────────────────────
// Asistencia con IA (RF-17, RF-18, RF-24)
//
// El asistente es opcional: si no hay credencial configurada, getEstadoIA
// devuelve disponible=false y la interfaz lo oculta. Nada de lo que hay aquí
// interviene en el cálculo.
// ─────────────────────────────────────────────────────────────────────

// El servidor explica en `detail` por qué el asistente no está disponible; ese
// texto es el que se muestra, de ahí que no sirva pedir() tal cual.
async function enviar(ruta, datos) {
  const res = await fetch(`${BASE}${ruta}`, conCuerpo('POST', datos || {}))
  const cuerpo = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(cuerpo.detail || 'El asistente no está disponible')
  return cuerpo
}

export function getEstadoIA() {
  return pedir('/recomendaciones/ia/estado/', 'Error al consultar el estado del asistente')
}

export function pedirSugerencias(factorId, software) {
  return enviar('/recomendaciones/ia/sugerencias/', {
    factor_id: factorId,
    ...softwareAPayload(software || SOFTWARE_VACIO),
  })
}

export function pedirInforme(id) {
  return enviar(`/evaluaciones/${id}/informe/`)
}

export function pedirPlanNarrado(id) {
  return enviar(`/evaluaciones/${id}/plan/`)
}
