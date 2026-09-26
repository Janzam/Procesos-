// origen: main.py (Tab 1) | cambio: tarjetas por dimensión + selector de 4 opciones por factor
import { calcularIR } from '../../api/guiosad.js'

const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']
// Tono del botón seleccionado según el nivel elegido (rojo → verde).
// Son clases propias del selector: la tabla de resultados mantiene su gris
// para "Irrelevante", donde el rojo daría a entender un problema.
const SEG_CLASS = ['seg-n1', 'seg-n2', 'seg-n3', 'seg-n4']

// Cada dimensión tiene su propio color de cabecera
const DIM_KEY = {
  'Tecnológica':    'tec',
  'Organizacional': 'org',
  'Económica':      'eco',
}

export default function StepFactores({ factores, evaluacion, onChange, matrizIR }) {
  // dimension_nombre trae el nombre; el campo `dimension` es solo el id numérico
  const dims = [...new Set(factores.map(f => f.dimension_nombre))]

  function handleNivel(factorId, value) {
    onChange({ ...evaluacion, [factorId]: { ...evaluacion[factorId], importancia_decisor: value } })
  }
  function handleAlcance(factorId, value) {
    onChange({ ...evaluacion, [factorId]: { ...evaluacion[factorId], alcance_elegido: value } })
  }

  const idDe = f => evaluacion[f.id]?.importancia_decisor ?? 1
  const ajustados = factores.filter(f => evaluacion[f.id]).length
  const fuera = factores.filter(f => !calcularIR(matrizIR, f.importancia_sugerida, idDe(f)).relevante).length

  return (
    <div>
      <div className="paso-aviso">
        <span><strong>{ajustados}</strong> de {factores.length} factores ajustados</span>
        {fuera > 0 && <span className="paso-aviso-muted">{fuera} no se evaluarán por tener importancia Irrelevante</span>}
      </div>

      <div className="dim-grid">
        {dims.map((dim, di) => {
          const key = DIM_KEY[dim] || 'tec'
          const dimFactores = factores.filter(f => f.dimension_nombre === dim)
          const hechos = dimFactores.filter(f => evaluacion[f.id]).length
          return (
            <div className="card" key={dim} style={{ animationDelay: `${di * 0.06}s` }}>
              <div className={`card-header hdr-${key}`}>
                <div className="card-header-badge">{di + 1}</div>
                <span className="card-header-title">Dimensión {dim}</span>
                <span className="card-header-count">{hechos}/{dimFactores.length}</span>
              </div>

              <div className="card-body">
                {dimFactores.map(f => {
                  const idVal = idDe(f)
                  // Sin elección del decisor se usa el mínimo (1). Se muestra en gris
                  // neutro, no como si el usuario hubiera elegido "Irrelevante".
                  const tocado = Boolean(evaluacion[f.id])
                  return (
                    <div className="fac-row" key={f.id}>
                      <span className="fac-nombre">{f.nombre}</span>
                      <span className="fac-sugerida">
                        La guía sugiere: {NIVELES[f.importancia_sugerida - 1]}
                        {f.alcance !== 'Ambos' && ` · Alcance ${f.alcance.toLowerCase()}`}
                      </span>

                      <div className="fac-control">
                        <div className="segmented segmented-fac" role="group" aria-label={`Importancia de ${f.nombre}`}>
                          {NIVELES.map((nivel, i) => (
                            <button
                              key={nivel}
                              type="button"
                              className={`seg-btn${idVal === i + 1 ? (tocado ? ` seg-activo ${SEG_CLASS[i]}` : ' seg-defecto') : ''}`}
                              aria-pressed={tocado && idVal === i + 1}
                              title={!tocado && i === 0 ? 'Valor por defecto: todavía no ha elegido' : undefined}
                              onClick={() => handleNivel(f.id, i + 1)}
                            >
                              {nivel}
                            </button>
                          ))}
                        </div>
                        {f.alcance === 'Ambos' && (
                          <select
                            className="alcance-select"
                            value={evaluacion[f.id]?.alcance_elegido || 'Interno'}
                            onChange={e => handleAlcance(f.id, e.target.value)}
                            title="Este factor puede evaluarse como interno o externo"
                          >
                            <option value="Interno">Interno</option>
                            <option value="Externo">Externo</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
