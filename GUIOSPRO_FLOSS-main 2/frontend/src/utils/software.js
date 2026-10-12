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
  return [sw.nombre, sw.version].filter(Boolean).join(' ').trim()
}

// Nombre con el que se guarda la evaluación y aparece en el historial.
export function nombreEvaluacion(sw) {
  const base = nombreCorto(sw)
  if (!base) return 'Evaluación sin nombre'
  return sw.organizacion ? `${base} — ${sw.organizacion}` : base
}

// Del formulario a los campos que espera la API.
export function softwareAPayload(sw) {
  return {
    software_nombre: sw.nombre,
    version: sw.version,
    licencia: sw.licencia,
    proveedor: sw.proveedor,
    organizacion: sw.organizacion,
    evaluador: sw.evaluador,
  }
}

// De los campos que devuelve la API al formulario.
export function softwareDesdeApi(datos) {
  const sw = { ...SOFTWARE_VACIO }
  for (const [k, v] of Object.entries(datos || {})) {
    sw[k === 'software_nombre' ? 'nombre' : k] = v
  }
  return sw
}
