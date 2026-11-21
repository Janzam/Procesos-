// origen: guiosad.py (get_suggested_importances, get_scopes) | cambio: datos ahora vienen del backend REST
import { SOFTWARE_VACIO, softwareAPayload } from '../utils/software.js'

// En Docker y en desarrollo la API está en el mismo dominio (/api). Desplegado
// en Vercel, el frontend y el backend son dos proyectos: VITE_API_URL lleva la
// dirección del backend (p. ej. https://guiosad-api.vercel.app), sin barra final.
const API_EXTERNA = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const BASE = `${API_EXTERNA}/api`

// Una petición a la API. Un fallo HTTP se convierte en un Error con el mensaje
// indicado; una respuesta sin cuerpo (204) devuelve undefined.
async function pedir(ruta, mensajeError, opciones) {
  const res = await fetch(`${BASE}${ruta}`, opciones)
  if (!res.ok) {
    // Si el backend explica el motivo (validación), se muestra en vez del genérico.
    const cuerpo = await res.json().catch(() => null)
    throw new Error(motivoError(cuerpo) || mensajeError)
  }
  return res.status === 204 ? undefined : res.json()
}

const ETIQUETAS_CAMPO = {
  nombre: 'Nombre', software_nombre: 'Nombre del software', version: 'Versión', licencia: 'Licencia',
  proveedor: 'Proveedor', organizacion: 'Organización', evaluador: 'Evaluador', factores: 'Factores',
}

// Convierte la respuesta de error de DRF ({detail} o {campo: [mensajes]}) en una frase.
function motivoError(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return ''
  if (typeof cuerpo.detail === 'string') return cuerpo.detail
  const partes = Object.entries(cuerpo).map(([campo, msgs]) => {
    const texto = Array.isArray(msgs) ? msgs.filter(m => typeof m === 'string').join(' ') : (typeof msgs === 'string' ? msgs : '')
    return texto ? `${ETIQUETAS_CAMPO[campo] || campo}: ${texto}` : ''
  }).filter(Boolean)
  return partes.join(' · ')
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

// Plantilla Excel para evaluar sin el asistente. El backend la genera en cada
// descarga a partir del catálogo vigente; se descarga con un enlace directo para
// que el navegador no la bloquee.
export const URL_PLANTILLA = `${BASE}/evaluaciones/plantilla/`

// Sube la plantilla llena. Si el archivo tiene errores, el backend explica cuáles
// y aquí se devuelven tal cual, en vez de un mensaje genérico.
export async function importarPlantilla(archivo) {
  const datos = new FormData()
  datos.append('archivo', archivo)
  const res = await fetch(`${BASE}/evaluaciones/importar/`, { method: 'POST', body: datos })
  const cuerpo = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errores = cuerpo.archivo || cuerpo.factores
      || [motivoError(cuerpo) || 'No se pudo importar la plantilla.']
    const e = new Error(errores[0])
    e.errores = errores
    throw e
  }
  return cuerpo
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

// Informe guardado (no llama al modelo). Devuelve { informe, vigente, fecha, modelo }.
export function getInforme(id) {
  return pedir(`/evaluaciones/${id}/informe/`, 'Error al cargar el informe')
}

// Redacta el informe si no hay uno vigente; con forzar=true lo vuelve a redactar.
export function pedirInforme(id, forzar = false) {
  return enviar(`/evaluaciones/${id}/informe/`, { forzar })
}

export function pedirPlanNarrado(id) {
  return enviar(`/evaluaciones/${id}/plan/`)
}

// ─────────────────────────────────────────────────────────────────────
// Importancia de la literatura (innovación CP2)
// La IA clasifica artículos; el cálculo de IL e IS lo hace el backend.
// ─────────────────────────────────────────────────────────────────────

// Funciones opcionales activas en el servidor (p. ej. { plantilla: true }).
export function getFunciones() {
  return pedir('/evaluaciones/funciones/', 'Error al consultar las funciones')
}

// Catálogo vigente: versión, origen de la IS (tesis o corrida aplicada) e IS por factor.
export function getEstadoCatalogo() {
  return pedir('/evaluaciones/catalogo/', 'Error al consultar el catálogo')
}

export function getConfigLiteratura() {
  return pedir('/literatura/config/', 'Error al cargar la configuración de literatura')
}

export function getCorridas() {
  return pedir('/literatura/corridas/', 'Error al cargar las corridas')
}

export function crearCorrida(payload) {
  return pedir('/literatura/corridas/', 'Error al iniciar la corrida', conCuerpo('POST', payload))
}

export function getCorrida(id) {
  return pedir(`/literatura/corridas/${id}/`, 'Error al cargar la corrida')
}

export function getProgreso(id, desde) {
  const sufijo = desde ? `?desde=${desde}` : ''
  return pedir(`/literatura/corridas/${id}/progreso/${sufijo}`, 'Error al consultar el progreso')
}

export function reanudarCorrida(id) {
  return pedir(`/literatura/corridas/${id}/reanudar/`, 'Error al reanudar la corrida', {
    method: 'POST',
  })
}

export function activarCorrida(id, accion) {
  return enviar(`/literatura/corridas/${id}/activar/`, { accion })
}

export function getComparacion(id) {
  return pedir(`/literatura/corridas/${id}/comparar/`, 'Error al cargar la comparación')
}

export async function eliminarCorrida(id) {
  const res = await fetch(`${BASE}/literatura/corridas/${id}/`, { method: 'DELETE' })
  if (res.status === 204) return
  const cuerpo = await res.json().catch(() => ({}))
  throw new Error(cuerpo.detail || 'Error al eliminar la corrida')
}
