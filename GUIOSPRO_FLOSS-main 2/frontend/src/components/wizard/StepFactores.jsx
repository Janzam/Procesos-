// origen: main.py (Tab 1) | cambio: tarjetas por dimensión + selector de 4 opciones por factor
import { calcularIR, esRelevante } from '../../api/guiosad.js'

const NIVELES = ['Irrelevante', 'Opcional', 'Importante', 'Fundamental']
const CORTOS = ['Irrelev.', 'Opcional', 'Important.', 'Fundam.']
// Tono del botón seleccionado según el nivel elegido (rojo → verde).
// Son clases propias del selector: la tabla de resultados mantiene su gris
// para "Irrelevante", donde el rojo daría a entender un problema.
const SEG_CLASS = ['seg-n1', 'seg-n2', 'seg-n3', 'seg-n4']

// Cada dimensión tiene su propio color
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
  // Un factor está ajustado cuando el decisor eligió su importancia. Elegir solo
  // el alcance de un factor 'Ambos' crea la entrada pero no fija el nivel, así que
  // no basta con que la entrada exista.
  const ajustado = f => evaluacion[f.id]?.importancia_decisor !== undefined
  const ajustados = factores.filter(ajustado).length
  const fuera = factores.filter(f => !esRelevante(f, evaluacion, matrizIR)).length
  const pct = factores.length ? Math.round((ajustados / factores.length) * 100) : 0

  return (
    <div>
      <div className="paso-barra">
        <div className="paso-barra-texto">
          <strong>{ajustados}</strong> de {factores.length} factores ajustados
          {fuera > 0 && (
            <span className="paso-barra-nota">
              {fuera} quedarán fuera de la evaluación por resultar irrelevantes
            </span>
          )}
        </div>
        <div className="paso-barra-pista"><span style={{ width: pct + '%' }} /></div>
      </div>

      <div className="dim-grid">
        {dims.map(dim => {
          const key = DIM_KEY[dim] || 'tec'
          const dimFactores = factores.filter(f => f.dimension_nombre === dim)
          const hechos = dimFactores.filter(ajustado).length
          return (
            <section className={`dim-card dim-${key}`} key={dim}>
              <header className="dim-cab">
                <span className="dim-punto" aria-hidden="true" />
                <h3 className="dim-titulo">{dim}</h3>
                <span className="dim-cuenta">{hechos}<small>/{dimFactores.length}</small></span>
              </header>

              <div className="dim-cuerpo">
                {dimFactores.map(f => {
                  const idVal = idDe(f)
                  // Sin elección del decisor se usa el mínimo (1). Se muestra en gris
                  // neutro, no como si el usuario hubiera elegido "Irrelevante".
                  const tocado = ajustado(f)
                  const ir = calcularIR(matrizIR, f.importancia_sugerida, idVal)
                  return (
                    <article className={`fac-row${tocado ? ' fac-row-hecho' : ''}`} key={f.id}>
                      <div className="fac-cab">
                        <span className="fac-nombre">{f.nombre}</span>
                        <span className="fac-chips">
                          <span className="fac-chip">
                            Guía: <b>{NIVELES[f.importancia_sugerida - 1]}</b>
                          </span>
                          {f.alcance !== 'Ambos' && (
                            <span className="fac-chip">{f.alcance}</span>
                          )}
                        </span>
                      </div>

                      <div className="fac-control">
                        <div className="segmented segmented-fac" role="group" aria-label={`Importancia de ${f.nombre}`}>
                          {NIVELES.map((nivel, i) => (
                            <button
                              key={nivel}
                              type="button"
                              className={`seg-btn${idVal === i + 1 ? (tocado ? ` seg-activo ${SEG_CLASS[i]}` : ' seg-defecto') : ''}`}
                              aria-pressed={tocado && idVal === i + 1}
                              title={!tocado && i === 0 ? 'Valor por defecto: todavía no ha elegido' : nivel}
                              onClick={() => handleNivel(f.id, i + 1)}
                            >
                              {CORTOS[i]}
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

                      {/* En qué queda el factor al combinar lo que sugiere la guía con lo
                          que elige el decisor. Es el paso 2 del método, visible mientras
                          se responde en vez de solo al final. */}
                      <div className="fac-ir">
                        <span className="fac-ir-flecha" aria-hidden="true">→</span>
                        {ir.relevante
                          ? <>Se evaluará como <span className={`badge badge-ir-${ir.etiqueta.toLowerCase()}`}>{ir.etiqueta}</span></>
                          : <span className="fac-ir-fuera">No se evaluará: resulta irrelevante</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
