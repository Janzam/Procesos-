# MIGRACION_GUIOSAD.md — Tabla de trazabilidad

Registra cada archivo nuevo generado en la migración: su origen en el sistema original,
qué se conservó y qué cambió.

---

## Convención de columnas

| Columna | Descripción |
|---|---|
| **Archivo nuevo** | Ruta relativa del archivo generado |
| **Origen** | Archivo(s) del sistema original de los que proviene la lógica |
| **Qué se conservó** | Lógica o datos que NO cambiaron |
| **Qué cambió** | Cambios realizados (solo los 2 permitidos o nuevo) |

---

## Tabla de trazabilidad

### Backend

| Archivo nuevo | Origen | Qué se conservó | Qué cambió |
|---|---|---|---|
| `backend/guiosad/settings.py` | — | — | Nuevo (configuración Django) |
| `backend/guiosad/urls.py` | — | — | Nuevo (routing REST) |
| `backend/guiosad/wsgi.py` | — | — | Nuevo (WSGI entry point) |
| `backend/factores/models.py` | `guiosad.py` (clases `Dimension`, `Factor`, `Subfactor`) | Estructura completa: nombre, dimensión, importancia_sugerida, alcance, subfactores | Solo se movió a modelos Django ORM; ninguna regla de negocio cambió |
| `backend/factores/serializers.py` | `guiosad.py` (método `get_suggested_importances`, `get_scopes`) | Todos los campos expuestos | Nuevo formato: JSON REST en lugar de objetos Python |
| `backend/factores/views.py` | `guiosad.py` (clase `Guiosad.__init__`, carga de CSV) | Lista completa de factores | Fuente cambiada de CSV+pandas a Postgres. **v2.1.0**: eliminado `DimensionListView` (`/dimensiones/`), que el frontend nunca consultó |
| `backend/factores/urls.py` | — | — | Nuevo (endpoints REST) |
| `backend/evaluaciones/models.py` | **Nuevo** | — | No existía; es la persistencia nueva (cambio explícito #2) |
| `backend/evaluaciones/serializers.py` | **Nuevo** | — | No existía |
| `backend/evaluaciones/views.py` | **Nuevo** | — | No existía; orquesta la lógica de cálculo |
| `backend/evaluaciones/urls.py` | — | — | Nuevo |
| `backend/recomendaciones/services.py` | `main.py` (`update_results`, `btn_sub_pressed`, `compute_recommendation`) | **Todas las fórmulas preservadas exactamente**: IR = `(r1+r2)//2`, ponderación global = media aritmética, FODA por alcance+ponderación, 3 reglas de recomendación en mismo orden | **Bug fix** (cambio explícito #1): `a, b, c = False` → `a, b, c = False, False, False` en línea 351 original |
| `backend/recomendaciones/views.py` | `main.py` (cálculo IR para feedback en tiempo real) | Misma fórmula IR | Expuesto como endpoint REST. **v2.1.0**: expone `matriz-ir/` con la matriz 4×4 precalculada para que el frontend no duplique la fórmula; se eliminó `calcular-ir/`, que nadie usaba |
| `backend/recomendaciones/urls.py` | — | — | Nuevo |
| `backend/fixtures/factores.json` | `guiosad_data.csv`, `factors.csv` | Los 3 dimensiones y 18 factores exactos con sus importancias sugeridas y alcances | Formato cambiado de CSV+tabulador a JSON Django fixture |
| `backend/fixtures/subfactores.json` | `guiosad_data.csv` | Los 61 subfactores exactos con su factor padre y orden | Formato cambiado de CSV+tabulador a JSON Django fixture |
| ~~`backend/usuarios/`~~ | Stub creado en v2.0.0 | — | **Eliminado en v2.1.0**: el modelo no lo importaba ningún módulo y el sistema no tiene autenticación. También se eliminó la tabla `usuarios_usuario` |
| ~~`backend/reportes/`~~ | Stub creado en v2.0.0 | — | **Eliminado en v2.1.0**: solo lanzaba `NotImplementedError`. La exportación PDF/Excel se implementó en el frontend |
| `backend/Dockerfile` | — | — | Nuevo |
| `backend/requirements.txt` | — | — | Nuevo (Django, DRF, psycopg2, gunicorn, decouple, cors) |
| `backend/manage.py` | — | — | Nuevo (estándar Django) |

---

### Frontend

| Archivo nuevo | Origen | Qué se conservó | Qué cambió |
|---|---|---|---|
| `frontend/src/api/guiosad.js` | `guiosad.py` (acceso a datos) | — | Fuente de datos: de CSV a endpoints REST. **v2.1.0**: se eliminó `calcularIRLocal`; la fórmula IR vive solo en el backend y aquí se consulta la matriz que envía `matriz-ir/` |
| `frontend/src/components/wizard/StepFactores.jsx` | `main.py` (Tab 1: sliders de factores, `update_results`) | 18 factores con IS, importancia del decisor, cálculo IR en tiempo real, alcance para factores "Ambos" | UI migrada de flexx a React; mismo flujo. **v2.1.0**: el slider se sustituye por cuatro botones con el nombre de cada nivel; una tarjeta por dimensión con su color |
| `frontend/src/components/wizard/StepSubfactores.jsx` | `main.py` (Tab 2: sliders de subfactores, `btn_sub_pressed`) | Escala 1-4 de cumplimiento por subfactor | UI migrada de flexx a React; mismo flujo. **v2.1.0**: lista lateral con progreso en vez de desplegable, cuatro botones por pregunta y avance automático al completar un factor |
| `frontend/src/components/wizard/StepResultados.jsx` | `main.py` (Tab 3: tabla FODA, `compute_recommendation`) | Tabla FODA por factor, recomendación coloreada A/B/C | UI migrada de flexx a React; se añadieron visualizaciones |
| `frontend/src/components/FodaFlower.jsx` | **Nuevo** | — | No existía en el sistema original; visualización gráfica de resultados FODA |
| `frontend/src/components/RadarDimensiones.jsx` | **Nuevo** | — | No existía; radar chart de ponderación media por dimensión |
| `frontend/src/pages/EvaluacionPage.jsx` | `main.py` (flujo completo de 6 pasos) | Mismo flujo de 6 pasos | Arquitectura SPA; persistencia al backend. **v2.1.0**: 4 etapas (se añade "Software"), progreso guardado en `localStorage` y aviso antes de calcular si quedan preguntas sin responder |
| `frontend/src/pages/HistorialPage.jsx` | **Nuevo** | — | No existía; habilitado por la persistencia nueva (cambio explícito #2) |
| `frontend/src/components/wizard/StepSoftware.jsx` | **Nuevo (v2.1.0)** | — | No existía; recoge los datos del software evaluado (nombre, versión, licencia, proveedor, organización, evaluador) |
| `frontend/src/pages/DashboardPage.jsx` | **Nuevo (v2.1.0)** | — | No existía; métricas agregadas de todas las evaluaciones |
| `frontend/src/utils/exportar.js` | **Nuevo (v2.1.0)** | — | No existía; exportación a PDF (jsPDF) y Excel (ExcelJS) generada en el navegador. Sustituye a los stubs de `backend/reportes/` |
| `frontend/src/components/Stepper.jsx` | **Nuevo** | — | No existía; indicador visual de las etapas del asistente |
| `frontend/src/components/Sidebar.jsx` | **Nuevo** | — | No existía; navegación entre Dashboard, Nueva Evaluación e Historial |
| `frontend/src/App.jsx` | — | — | Nuevo (router de página) |
| `frontend/Dockerfile` | — | — | Nuevo (multistage build + nginx) |
| `frontend/nginx.conf` | — | — | Nuevo (sirve SPA y hace proxy al backend) |
| `frontend/package.json` | — | — | Nuevo (React 18, Vite, recharts) |
| `frontend/vite.config.js` | — | — | Nuevo (proxy al backend en dev) |

---

### Raíz

| Archivo nuevo | Origen | Qué se conservó | Qué cambió |
|---|---|---|---|
| `docker-compose.yml` | — | — | Nuevo (Postgres + backend + frontend) |
| `MIGRACION_GUIOSAD.md` | — | — | Este archivo |

---

## Cambios explícitos documentados

### Cambio #1 — Bug fix en `compute_recommendation`

**Archivo original:** `main.py`, línea 351  
**Archivo nuevo:** `backend/recomendaciones/services.py`

```python
# ANTES (bug: Python 3 no admite asignación múltiple así)
a, b, c = False

# DESPUÉS (corrección)
a, b, c = False, False, False
```

El resultado de las 3 reglas de recomendación **no cambia** — el bug anterior causaba
`NameError` en tiempo de ejecución porque `b` y `c` quedaban sin definir.

---

### Cambio #2 — Persistencia real de evaluaciones

**Archivos nuevos:** `backend/evaluaciones/models.py`, `backend/evaluaciones/views.py`  
**Origen:** No existía en el sistema original.

Las evaluaciones ahora se guardan en Postgres con modelos `Evaluacion`, `EvaluacionFactor`
y `EvaluacionSubfactor`. Esto habilita:
- Historial de evaluaciones (`HistorialPage.jsx`)
- Múltiples usuarios usando el sistema simultáneamente
- Trazabilidad de decisiones en el tiempo

---

## Estado de los pendientes

Los tres stubs que v2.0.0 dejó abiertos ya no existen como archivos: dos se
implementaron y uno se descartó.

| Feature | Estado |
|---|---|
| Exportación PDF | **Implementada (v2.1.0)** en `frontend/src/utils/exportar.js` con jsPDF. Se generó en el navegador en lugar del backend para no añadir dependencias de renderizado al servidor |
| Exportación Excel | **Implementada (v2.1.0)** en el mismo archivo con ExcelJS, con formato, autofiltro y colores por categoría |
| Autenticación/usuarios | **Descartada (v2.1.0)**: la app `usuarios` se eliminó por no usarse. Si se retoma, requiere decidir la arquitectura (JWT, sesiones, OAuth) y volver a crear el modelo |

---

## Pendiente de decisión académica

Límites de la fórmula documentados en `CHANGELOG.md` (v2.1.0 → *Límites conocidos*).
No son defectos de implementación sino comportamientos de la metodología original,
así que modificarlos supone proponer una variante del método y necesita aprobación:

- El nivel **Fundamental** es inalcanzable (ningún factor tiene importancia sugerida 4)
- La división entera colapsa posiciones del selector en un mismo resultado
- El umbral FODA de 3.0 es un corte duro sin zona gris
- Un solo factor Debilidad/Amenaza importante fuerza la recomendación C
- "Desconozco si cumple" entra en el promedio con valor 2
- Los factores pesan igual tengan 1 u 11 subfactores
- Las letras A/B/C están invertidas respecto a la matriz GUIOSAD 2021 (ver `CHANGELOG.md` → v2.1.0)
