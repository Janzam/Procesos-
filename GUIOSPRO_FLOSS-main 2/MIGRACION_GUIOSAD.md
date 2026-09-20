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
| `backend/factores/views.py` | `guiosad.py` (clase `Guiosad.__init__`, carga de CSV) | Lista completa de factores y dimensiones | Fuente cambiada de CSV+pandas a Postgres |
| `backend/factores/urls.py` | — | — | Nuevo (endpoints REST) |
| `backend/evaluaciones/models.py` | **Nuevo** | — | No existía; es la persistencia nueva (cambio explícito #2) |
| `backend/evaluaciones/serializers.py` | **Nuevo** | — | No existía |
| `backend/evaluaciones/views.py` | **Nuevo** | — | No existía; orquesta la lógica de cálculo |
| `backend/evaluaciones/urls.py` | — | — | Nuevo |
| `backend/recomendaciones/services.py` | `main.py` (`update_results`, `btn_sub_pressed`, `compute_recommendation`) | **Todas las fórmulas preservadas exactamente**: IR = `(r1+r2)//2`, ponderación global = media aritmética, FODA por alcance+ponderación, 3 reglas de recomendación en mismo orden | **Bug fix** (cambio explícito #1): `a, b, c = False` → `a, b, c = False, False, False` en línea 351 original |
| `backend/recomendaciones/views.py` | `main.py` (cálculo IR para feedback en tiempo real) | Misma fórmula IR | Expuesto como endpoint REST |
| `backend/recomendaciones/urls.py` | — | — | Nuevo |
| `backend/fixtures/factores.json` | `guiosad_data.csv`, `factors.csv` | Los 3 dimensiones y 18 factores exactos con sus importancias sugeridas y alcances | Formato cambiado de CSV+tabulador a JSON Django fixture |
| `backend/fixtures/subfactores.json` | `guiosad_data.csv` | Los 61 subfactores exactos con su factor padre y orden | Formato cambiado de CSV+tabulador a JSON Django fixture |
| `backend/usuarios/models.py` | **Nuevo (stub)** | — | Pendiente para sprint posterior. Sin auth real, sin permisos. |
| `backend/reportes/exportar_pdf.py` | **Nuevo (stub)** | — | Pendiente para sprint posterior. Lanza `NotImplementedError`. |
| `backend/reportes/exportar_excel.py` | **Nuevo (stub)** | — | Pendiente para sprint posterior. Lanza `NotImplementedError`. |
| `backend/Dockerfile` | — | — | Nuevo |
| `backend/requirements.txt` | — | — | Nuevo (Django, DRF, psycopg2, gunicorn, decouple, cors) |
| `backend/manage.py` | — | — | Nuevo (estándar Django) |

---

### Frontend

| Archivo nuevo | Origen | Qué se conservó | Qué cambió |
|---|---|---|---|
| `frontend/src/api/guiosad.js` | `guiosad.py` (acceso a datos) + `main.py` (fórmula IR) | Fórmula IR idéntica en `calcularIRLocal` para feedback inmediato | Fuente de datos: de CSV a endpoints REST |
| `frontend/src/components/wizard/StepFactores.jsx` | `main.py` (Tab 1: sliders de factores, `update_results`) | 18 factores con IS, slider decisor, cálculo IR en tiempo real, campo alcance para factores "Ambos" | UI migrada de flexx a React; mismo flujo |
| `frontend/src/components/wizard/StepSubfactores.jsx` | `main.py` (Tab 2: sliders de subfactores, `btn_sub_pressed`) | Selector de factor relevante, sliders 1-4 por subfactor, etiqueta de cumplimiento | UI migrada de flexx a React; mismo flujo |
| `frontend/src/components/wizard/StepResultados.jsx` | `main.py` (Tab 3: tabla FODA, `compute_recommendation`) | Tabla FODA por factor, recomendación coloreada A/B/C | UI migrada de flexx a React; se añadieron visualizaciones |
| `frontend/src/components/FodaFlower.jsx` | **Nuevo** | — | No existía en el sistema original; visualización gráfica de resultados FODA |
| `frontend/src/components/RadarDimensiones.jsx` | **Nuevo** | — | No existía; radar chart de ponderación media por dimensión |
| `frontend/src/pages/EvaluacionPage.jsx` | `main.py` (flujo completo de 6 pasos) | Mismo flujo de 6 pasos agrupado en 3 etapas del wizard | Arquitectura SPA; persistencia al backend |
| `frontend/src/pages/HistorialPage.jsx` | **Nuevo** | — | No existía; habilitado por la persistencia nueva (cambio explícito #2) |
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

## Pendientes para sprint posterior

| Feature | Archivo stub | Motivo de postergación |
|---|---|---|
| Exportación PDF | `backend/reportes/exportar_pdf.py` | Requiere librería de renderizado (weasyprint/reportlab) y diseño de plantilla |
| Exportación Excel | `backend/reportes/exportar_excel.py` | Requiere openpyxl y diseño de hoja |
| Autenticación/usuarios | `backend/usuarios/models.py` | Requiere decisión de arquitectura (JWT, sesiones, OAuth) |
