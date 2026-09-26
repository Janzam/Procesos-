# CHANGELOG — GUIOSAD

Historial de cambios desde el sistema original (Python + flexx) hasta la versión actual (Django REST + React).

---

## v2.1.0 — Corrección de bugs, nuevas funcionalidades, rediseño y limpieza (2026-09-23)

### Resumen

**Ninguna fórmula de la metodología GUIOSAD fue modificada.** Esta versión corrige
defectos de implementación, incorpora funcionalidades que no existían, rediseña la
interfaz y elimina el código que no se usaba. Las evaluaciones guardadas antes de
esta versión conservan exactamente la misma recomendación A/B/C.

---

### 🐞 Bugs corregidos

| # | Problema | Corrección |
|---|---|---|
| 1 | Un factor con alcance `Ambos` sin elección del decisor se clasificaba como **Externo en silencio**: `clasificar_foda` solo comprobaba `== "Interno"` y todo lo demás caía en el `else`. Afectaba al factor *Soporte*. | El endpoint rechaza con 400 si falta `alcance_elegido`; `clasificar_foda` lanza error ante un alcance inválido; el frontend envía siempre el valor explícito que muestra el formulario |
| 2 | Las tarjetas de dimensión mostraban **"Dimensión 1, 2, 3"** y las tres del mismo color: el frontend leía `f.dimension` (el id numérico) en lugar de `f.dimension_nombre` | Se usa `dimension_nombre`; cada dimensión recupera su nombre y su color |
| 3 | El badge **"IR" del paso Factores salía siempre vacío**: leía `ir.valor`, una propiedad inexistente | Se usan `ir.indice` e `ir.etiqueta` |
| 4 | La **fórmula IR estaba duplicada** en Python y en JavaScript: dos copias que podían divergir sin aviso | Nuevo endpoint `GET /api/recomendaciones/matriz-ir/` con la matriz 4×4 calculada por Python; el frontend ya no contiene la fórmula |
| 5 | **Factores evaluados que el usuario nunca veía**: el paso Subfactores excluía los factores sin ajustar, pero el cálculo sí los enviaba como relevantes con todos sus subfactores en 1 | Ambos lugares aplican la misma regla de relevancia |
| 6 | **Sin transacción**: un fallo a mitad del guardado dejaba una evaluación incompleta en la base de datos | Validación previa a cualquier escritura + `transaction.atomic()` |
| 7 | El **círculo A/B/C del historial nunca aparecía**: el listado no devolvía `recomendacion_codigo` | El endpoint de listado incluye el código de recomendación |
| 8 | La **barra de progreso no contaba** los subfactores marcados como "No cumple" (solo contaba valores > 1) | Cuenta los realmente respondidos |
| 9 | `calcular_recomendacion` asignaba una tercera bandera (`c`) que nunca se leía — resto del bug original de `main.py` | Dos banderas con nombre: `hay_critico` / `hay_opcional`. Sin cambio de comportamiento |
| 10 | `calcular_ponderacion_global` devolvía **0.0** con lista vacía, valor que al clasificarse habría dado siempre Debilidad/Amenaza | Devuelve `None` |
| 11 | **N+1 consultas**: una consulta de subfactores por cada factor y la dimensión sin `select_related` | Una sola consulta agrupada |
| 12 | El **alcance dejó de mostrarse** en el paso Factores. El rediseño `e45fcde` eliminó la rama que lo pintaba como texto en los 17 factores que no son «Ambos»; el dato seguía usándose en el cálculo, pero el decisor ya no podía saber por qué un factor acababa en Debilidad y no en Amenaza | Se muestra de nuevo junto a la importancia sugerida. En *Soporte* se mantiene el desplegable, por ser el único que el decisor debe elegir |
| 13 | **La descarga del PDF y del Excel quedaba bloqueada por el navegador.** El módulo de exportación (~1,3 MB) se cargaba al pulsar el botón; mientras se descargaba expiraba la activación transitoria del gesto y el navegador rechazaba el archivo por no considerarlo iniciado por el usuario | El módulo se precarga al entrar en la pantalla de Resultados, de modo que al pulsar ya está disponible y la descarga se dispara dentro del gesto |

---

### 🆕 Nuevas funcionalidades

| Funcionalidad | Detalle |
|---|---|
| **Paso "Software a evaluar"** | Nuevo primer paso del asistente: nombre, versión, tipo de licencia, proveedor, organización y evaluador. Todos opcionales; componen el nombre de la evaluación |
| **Datos del software persistidos** | Los seis campos se guardan como columnas propias de la evaluación (migración `0002`), no solo fundidos en el nombre. El historial los muestra en una ficha y el listado permite filtrar por organización y licencia |
| **Dashboard** | Nueva sección con métricas agregadas de todas las evaluaciones: banner de foco, KPIs y gráficos de veredictos y factores más problemáticos. Endpoint `GET /api/evaluaciones/dashboard/` |
| **Exportación PDF** | Implementada en el frontend con jsPDF: cabecera, recomendación, tabla de factores y tabla FODA de 4 columnas, con paginación |
| **Exportación Excel** | Implementada en el frontend con ExcelJS: tres hojas con formato, autofiltro, paneles fijos y colores por categoría |
| **Persistencia del progreso** | El paso actual, los datos del software y todas las respuestas se guardan en `localStorage`. Al recargar se continúa donde se estaba |
| **Avance automático** | Al completar todos los subfactores de un factor, el asistente salta solo al siguiente pendiente |
| **Preferencias recordadas** | Tema claro/oscuro, sección activa, y visibilidad del menú lateral, los gráficos y la lista del historial |
| **Avisos de estado** | Contadores de progreso por paso y confirmación antes de calcular si quedan preguntas sin responder (que se cuentan como "No cumple") |
| **Carga con reintentos** | El frontend reintenta cargar los factores mientras el backend termina de arrancar en Docker |

---

### 🎨 Rediseño de interfaz

| Antes | Ahora |
|---|---|
| Paleta turquesa (`#14b8a6`) | Paleta índigo/pizarra (`#6366f1`); variables CSS renombradas de `--teal*` a `--brand*` |
| Sliders de rango 1–4 | Selectores de cuatro botones con la etiqueta de cada nivel, coloreados de rojo a verde |
| Cuadrantes FODA rectangulares | Diagrama FODA en flor de cuatro pétalos |
| Tres cabeceras de dimensión iguales | Una por dimensión: celeste (Tecnológica), morado (Organizacional), naranja (Económica) |
| Desplegable para elegir factor en Subfactores | Lista lateral fija con barra de progreso y ✓ por factor |
| Radar de 220 px | Radar de 320 px con colores del tema |
| Pie de menú con usuario ficticio "Decisor" | Eliminado (el sistema no tiene autenticación) |
| Botón «Irrelevante» marcado en rojo por defecto | El valor por defecto se muestra en gris neutro; el color aparece solo cuando el decisor elige. Se corrigió también el `aria-pressed`, que anunciaba una selección inexistente |

Además: modo claro/oscuro revisado en todos los componentes, paneles plegables
(menú lateral, gráficos de resultados, lista del historial) y diseño adaptable.

---

### 🧹 Código y archivos eliminados

| Elemento | Motivo |
|---|---|
| `backend/reportes/` | Los stubs `exportar_pdf.py` y `exportar_excel.py` solo lanzaban `NotImplementedError`. La exportación se resolvió en el frontend |
| `backend/usuarios/` | Modelo `Usuario` que ningún módulo importaba. El sistema no tiene autenticación |
| Tabla `usuarios_usuario` | Eliminada de PostgreSQL junto con su registro en `django_migrations`. Estaba vacía y sin claves foráneas |
| `POST /api/recomendaciones/calcular-ir/` | Endpoint que nadie llamaba; era el motivo de que la fórmula IR se hubiera duplicado en JavaScript |
| `GET /api/factores/dimensiones/` | Endpoint, vista y `DimensionSerializer` nunca consultados por el frontend |
| CSS muerto | ~90 líneas: sliders, desplegable anterior, degradados de dimensión, barra de progreso antigua y clases huérfanas |

---

### ⚠️ Límites conocidos de la fórmula (**no modificados**)

Documentados para decisión posterior. Son comportamientos de la metodología
original, no defectos de implementación; cambiarlos supone proponer una variante
del método y requiere aprobación académica.

| Límite | Efecto observado |
|---|---|
| Ningún factor tiene importancia sugerida 4 | El nivel **Fundamental** es inalcanzable: `IR` necesita `IS=4` e `ID=4` |
| División entera en `IR = (IS-1 + ID-1) // 2` | Varias posiciones del selector producen el mismo resultado; con `IS=3` solo hay 2 resultados distintos |
| Umbral FODA en 3.0 | Corte duro sin zona gris: 2.99 → Debilidad, 3.00 → Fortaleza |
| Banderas booleanas en la recomendación | **Un solo** factor Debilidad/Amenaza importante fuerza la recomendación C sobre toda la evaluación |
| "Desconozco si cumple" vale 2 | La duda entra en el promedio como si fuera un cumplimiento parcial bajo |
| Valores por defecto (ID = 1, subfactor = 1) | Lo no respondido se calcula como "No cumple". Mitigado con avisos, sin alterar el cálculo |
| Factores con 1 a 11 subfactores | Todos pesan igual en la recomendación final |

---


### 📌 Correspondencia con la metodología GUIOS (tesis doctoral)

La implementación se cotejó paso a paso con la tesis doctoral que define GUIOS,
que es la **fuente autorizada** de la metodología. El resultado es que el sistema
la reproduce fielmente:

| Elemento | Referencia en la tesis | Estado |
|---|---|---|
| Matriz de Importancia Relativa | Figura 5.10 | Coincide en las 16 combinaciones con `(IS−1 + ID−1) // 2` |
| Selección de factores relevantes | Sección 5.2.3 — «importancia relativa mayor a 1» | Coincide: se descartan los Irrelevantes |
| Escala de subfactores | Sección 5.2.3 — 1 No cumple, 2 No sé, 3 Cumple parcialmente, 4 Cumple | Coincide |
| Ponderación media del factor | Sección 5.2.3 | Coincide: promedio de los subfactores |
| Clasificación FODA | Ecuación 5.3 | Coincide, incluido el umbral en 3 |
| Factores internos y externos | Tabla 5.4 | Coincide: 6 internos, 11 externos y *Soporte* como único «Ambos» |
| Letras A / B / C | Páginas 105-106 | Coincide: **A = adoptar**, B = adoptar con matices, C = posponer |

**Advertencia sobre el archivo `MATRIZ RECOMENDACION GUIOSAD 2021.xlsx`.** Ese
documento, incluido con el sistema original, es un **borrador previo** a la tesis
y usa la nomenclatura invertida (A como caso desfavorable). No debe tomarse como
referencia: la tesis es posterior y fija el criterio definitivo, que es el que
implementa el sistema.

#### Dos observaciones derivadas del cotejo

**El nivel «Fundamental» no puede alcanzarse.** Según la Tabla 5.3 de la tesis, la
Importancia del Experto es 3 en los 18 factores, por lo que la Importancia
Sugerida solo puede valer 2 o 3, y la Importancia Relativa nunca llega a 4. No es
un defecto de la implementación sino una consecuencia de cómo quedó calibrado el
instrumento. La tesis reconoce esta clase de limitación en la página 88, al
admitir que existen formas de cálculo que aprovecharían mejor la precisión de los
valores intermedios.

**El paso 6 es el único que la tesis no formaliza.** Las recomendaciones A, B y C
se describen con texto, y ese texto admite dos lecturas: para C habla de mayoría
(«las amenazas y debilidades son mayores a las oportunidades y fortalezas») y
para B habla de existencia («se han detectado… en características cuya importancia
relativa es opcional»). El `main.py` original contenía ambas implementaciones, una
sobrescribiendo a la otra. El sistema aplica la de existencia, igual que el código
original en su estado final.

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

> **Estado actual:** los tres stubs se resolvieron en v2.1.0 — exportación PDF y Excel
> implementadas en el frontend, y la app `usuarios` eliminada. Se conservan aquí como
> registro histórico de lo que incluía v2.0.0.

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
