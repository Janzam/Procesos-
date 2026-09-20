# CHANGELOG — GUIOSAD

Historial de cambios desde el sistema original (Python + flexx) hasta la versión actual (Django REST + React).

---

## v2.0.0 — Migración arquitectural (2026-09-20)

### Resumen
El sistema fue migrado de una app monolítica en Python (usando `flexx` para generar
un archivo HTML autocontenido) a una arquitectura desacoplada:
- **Backend**: Django REST Framework + PostgreSQL
- **Frontend**: React + Vite
- **Infraestructura**: Docker Compose (3 servicios: `db`, `backend`, `frontend`)

---

### ✅ Qué se preservó exactamente (sin cambios)

| Elemento | Detalle |
|---|---|
| **Datos** | Las 3 dimensiones, 18 factores y 61 subfactores exactos de los CSV originales, ahora como fixtures JSON |
| **Fórmula IR** | Importancia Relativa = `(índice_IS + índice_ID) // 2` (división entera, índices 0-3) |
| **Ponderación global** | Promedio aritmético simple de los valores 1-4 asignados a los subfactores |
| **Clasificación FODA** | Interno + ≥3 → Fortaleza; Interno + <3 → Debilidad; Externo + ≥3 → Oportunidad; Externo + <3 → Amenaza |
| **Recomendación A/B/C** | Mismas 3 reglas de prioridad en el mismo orden: C (amenaza/debilidad + importante/fundamental) → B (amenaza/debilidad + opcional) → A (todo fortaleza/oportunidad) |
| **Flujo de 6 pasos** | Igual estructura de evaluación, ahora en wizard de 3 pantallas |
| **Textos** | Los textos completos de las recomendaciones A, B y C son idénticos al original |

---

### 🔧 Cambio #1 — Corrección de bug (main.py línea 351)

**Código original (bug):**
```python
a, b, c = False  # ← Error: Python 3 no admite esta sintaxis
```

**Código corregido (`backend/recomendaciones/services.py`):**
```python
a, b, c = False, False, False
```

El bug causaba `NameError` en tiempo de ejecución porque `b` y `c` quedaban indefinidas.
El resultado lógico de las recomendaciones **no cambió** — solo se corrigió la asignación.

---

### 🆕 Cambio #2 — Persistencia real de evaluaciones

**Antes:** Las evaluaciones no se guardaban. Cada sesión era efímera y se perdía al cerrar.

**Ahora:** Las evaluaciones se guardan en PostgreSQL (modelos `Evaluacion`, `EvaluacionFactor`,
`EvaluacionSubfactor`). Esto habilita:
- **Historial**: página `/historial` con todas las evaluaciones anteriores
- **Múltiples usuarios**: varios decisores pueden usar el sistema simultáneamente
- **Trazabilidad**: cada evaluación queda registrada con fecha y nombre

---

### 🆕 Nuevas visualizaciones (no existían en el sistema original)

| Componente | Descripción |
|---|---|
| `FodaFlower.jsx` | Diagrama de flor SVG donde cada pétalo es un factor, coloreado según su categoría FODA |
| `RadarDimensiones.jsx` | Gráfico radar con la ponderación media de las 3 dimensiones (Tecnológica, Organizacional, Económica) |

---

### 🚧 Funcionalidades pendientes (stubs — sprint posterior)

| Feature | Archivo stub | Estado |
|---|---|---|
| Exportación PDF | `backend/reportes/exportar_pdf.py` | `NotImplementedError` |
| Exportación Excel | `backend/reportes/exportar_excel.py` | `NotImplementedError` |
| Autenticación de usuarios | `backend/usuarios/models.py` | Modelo básico sin auth real |

---

### ⚙️ Cambios de infraestructura

| Antes | Ahora |
|---|---|
| `python -m http.server 8080` | `docker compose up` |
| `guiosad.html` (autocontenido, 422KB) | React SPA servida por nginx |
| Sin base de datos | PostgreSQL 16 |
| `pandas` + CSV como fuente de datos | Fixtures JSON → PostgreSQL |
| `flexx` para generar la UI | React + Vite |

---

## v1.x — Sistema original (Python + flexx)

Aplicación monolítica donde `main.py` usaba el framework `flexx` para:
1. Renderizar la interfaz gráfica (tabs, sliders)
2. Ejecutar toda la lógica de cálculo vía `flx.reaction`
3. Exportar el resultado como `guiosad.html` autocontenido

Los datos de entrada (factores, subfactores) vivían en `guiosad_data.csv` y `factors.csv`.
