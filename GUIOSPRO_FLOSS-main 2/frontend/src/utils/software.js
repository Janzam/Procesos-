// Datos del software evaluado (RF-02), tal como los maneja el formulario.
//
// El formulario llama «nombre» a lo que la API y la base de datos llaman
// «software_nombre»; el resto de campos se llaman igual en los dos lados.
// Aquí viven, en un solo sitio, el estado vacío, el nombre con el que se guarda
// la evaluación y la conversión en ambos sentidos.

export const SOFTWARE_VACIO = {
  nombre: '',
  version: '',
  licencia: '',
  proveedor: '',
  organizacion: '',
  evaluador: '',
}

// «Moodle 4.3»: nombre y versión, los que haya.
export function nombreCorto(sw) {
  return [sw.nombre, sw.version].map(v => (v || '').trim()).filter(Boolean).join(' ')
}

// Nombre con el que se guarda la evaluación y aparece en el historial.
export function nombreEvaluacion(sw) {
  const base = nombreCorto(sw)
  if (!base) return 'Evaluación sin nombre'
  const org = (sw.organizacion || '').trim()
  const completo = org ? `${base} — ${org}` : base
  // El backend admite 250 caracteres: se acorta en vez de fallar al guardar.
  return completo.length > 250 ? `${completo.slice(0, 249)}…` : completo
}

// Del formulario a los campos que espera la API.
export function softwareAPayload(sw) {
  return {
    // Sin espacios sobrantes: «  Moodle » y «Moodle» son el mismo software.
    software_nombre: (sw.nombre || '').trim(),
    version: (sw.version || '').trim(),
    licencia: (sw.licencia || '').trim(),
    proveedor: (sw.proveedor || '').trim(),
    organizacion: (sw.organizacion || '').trim(),
    evaluador: (sw.evaluador || '').trim(),
  }
}

// Campos tal como los devuelve la API, con su etiqueta. Los usan la ficha del
// historial y los informes exportados (RF-02: los datos aparecen en el informe).
export const CAMPOS_SOFTWARE = [
  ['software_nombre', 'Software'], ['version', 'Versión'], ['licencia', 'Licencia'],
  ['proveedor', 'Proveedor'], ['organizacion', 'Organización'], ['evaluador', 'Evaluador'],
]

// [etiqueta, valor] de los datos que se rellenaron; las evaluaciones antiguas no los tienen.
export function datosSoftware(datos) {
  if (!datos) return []
  return CAMPOS_SOFTWARE.filter(([k]) => datos[k]).map(([k, etiqueta]) => [etiqueta, datos[k]])
}

// De los campos que devuelve la API al formulario.
export function softwareDesdeApi(datos) {
  const sw = { ...SOFTWARE_VACIO }
  for (const [k, v] of Object.entries(datos || {})) {
    sw[k === 'software_nombre' ? 'nombre' : k] = v
  }
  return sw
}
