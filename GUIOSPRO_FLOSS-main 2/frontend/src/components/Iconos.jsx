// Iconos de línea compartidos por toda la interfaz (24×24, trazo con el color
// del texto). Cada uno admite las props de un <svg>, por ejemplo width/height.
const BASE = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

function icono(nombre, trazo) {
  const Icono = props => <svg {...BASE} {...props}>{trazo}</svg>
  Icono.displayName = nombre
  return Icono
}

// Navegación
export const IcoPanel = icono('IcoPanel', <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>)
export const IcoMas = icono('IcoMas', <path d="M12 5v14M5 12h14"/>)
export const IcoHistorial = icono('IcoHistorial', <><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3.5 2"/></>)
export const IcoNuevaEval = icono('IcoNuevaEval', <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6M9 15h6"/></>)
export const IcoReloj = icono('IcoReloj', <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>)
export const IcoMenu = icono('IcoMenu', <path d="M4 6h16M4 12h16M4 18h16"/>)
export const IcoOcultar = icono('IcoOcultar', <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>)
export const IcoSol = icono('IcoSol', <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>)
export const IcoLuna = icono('IcoLuna', <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>)

// Pasos del asistente
export const IcoSoftware = icono('IcoSoftware', <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></>)
export const IcoFactores = icono('IcoFactores', <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></>)
export const IcoSubfactores = icono('IcoSubfactores', <><path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/></>)
export const IcoResultados = icono('IcoResultados', <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-6"/></>)
export const IcoCheck = icono('IcoCheck', <path d="m4 12 5 5L20 7"/>)

// Acciones
export const IcoPdf = icono('IcoPdf', <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>)
export const IcoExcel = icono('IcoExcel', <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>)
export const IcoEditar = icono('IcoEditar', <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>)
export const IcoBorrar = icono('IcoBorrar', <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></>)
export const IcoVer = icono('IcoVer', <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>)
export const IcoBuscar = icono('IcoBuscar', <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>)
export const IcoRejilla = icono('IcoRejilla', <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>)
export const IcoLista = icono('IcoLista', <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>)
export const IcoFlecha = icono('IcoFlecha', <path d="M5 12h14M13 6l6 6-6 6"/>)
export const IcoVolver = icono('IcoVolver', <path d="M19 12H5M11 18l-6-6 6-6"/>)

// Datos de una evaluación
export const IcoOrganizacion = icono('IcoOrganizacion', <><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>)
export const IcoFecha = icono('IcoFecha', <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>)
export const IcoUsuario = icono('IcoUsuario', <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>)

// Cifras del panel
export const IcoCarpeta = icono('IcoCarpeta', <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>)
export const IcoPulgar = icono('IcoPulgar', <><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M7 10l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 16.6 21H7"/></>)
export const IcoAlerta = icono('IcoAlerta', <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>)
export const IcoPausa = icono('IcoPausa', <><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></>)
export const IcoMedidor = icono('IcoMedidor', <><path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/><circle cx="12" cy="18" r="1.5"/></>)
export const IcoCapas = icono('IcoCapas', <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/></>)
export const IcoChispa = icono('IcoChispa', <><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m12 7 1.8 3.2L17 12l-3.2 1.8L12 17l-1.8-3.2L7 12l3.2-1.8z"/></>)
export const IcoVacio = icono('IcoVacio', <><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></>)
