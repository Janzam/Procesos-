# MEJORAS — GUIOSAD v2 frente al sistema original

Comparación entre el prototipo **GUIOS PRO** entregado como base y el sistema
actual. Todos los datos de este documento están verificados contra el código
fuente de ambos sistemas, contra la base de datos en ejecución y contra la tesis
doctoral que define la metodología GUIOS.

---

## 1. Punto de partida

El sistema base era una aplicación monolítica de escritorio construida con
`flexx` y `pandas`. Su funcionamiento consistía en ejecutar `main.py` (385
líneas) para generar un archivo `guiosad.html` autocontenido de 422 KB, que
después se abría en un navegador.

| Aspecto | Sistema original |
|---|---|
| Ejecución | Requiere Python 3.9, PyCharm y librerías instaladas manualmente |
| Interfaz | Tres pestañas con tablas planas y deslizadores |
| Almacenamiento | Ninguno: cada evaluación se pierde al cerrar |
| Datos maestros | Dos ficheros CSV separados por tabuladores |
| Distribución | Regenerar el HTML ejecutando el script |

---

## 2. Defectos del sistema base corregidos

Estos defectos se identificaron leyendo el código original y se corrigieron en la
versión actual. No son mejoras de opinión: son fallos verificables.

| Defecto | Evidencia en el original | Efecto |
|---|---|---|
| **La recomendación no funcionaba** | `a, b, c = False` (`main.py`, línea 351) lanza `TypeError` en Python 3 | Pulsar «Ver recomendación» interrumpía la ejecución |
| **Tres umbrales de relevancia distintos** | `r > 0` en `main.py`, `> 1` en una función auxiliar y `> 2` en `guiosad.py` | Solo uno se ejecutaba; los otros dos eran código muerto contradictorio |
| **Formato numérico inválido** | `"{:.1f}".format(str(global_weight))` lanza `ValueError` | La ponderación media no llegaba a mostrarse |
| **Dos reglas de recomendación superpuestas** | Un criterio por conteo y, justo debajo, otro booleano que lo sobrescribe | Ambigüedad sobre cuál era la regla vigente |
| **Sin trazabilidad de decisiones** | No existía persistencia | Imposible revisar, comparar ni auditar evaluaciones anteriores |

Durante el desarrollo se corrigieron además 13 defectos propios de la migración,
detallados en `CHANGELOG.md` (v2.1.0).

---

## 3. Mejoras de arquitectura

| Antes | Ahora | Beneficio |
|---|---|---|
| Aplicación monolítica en `flexx` | Backend Django REST + frontend React desacoplados | Cada capa evoluciona por separado; la lógica es reutilizable desde otros clientes |
| Datos en ficheros CSV | PostgreSQL 16 con seis tablas relacionadas | Integridad referencial, restricciones de unicidad e índices |
| Instalación manual de dependencias | `docker compose up` | El entorno se levanta idéntico en Windows, macOS y Linux |
| Lógica de cálculo dispersa entre `main.py` y `guiosad.py` | Un único módulo de servicios en el backend | La fórmula no puede divergir entre cliente y servidor |
| Sin control de versiones del proceso | Repositorio Git con ramas por línea de trabajo | Trazabilidad de cada cambio y trabajo en paralelo |

### La decisión de diseño más relevante

La base de datos **almacena únicamente las respuestas del decisor, nunca los
resultados calculados**. Cada evaluación guarda qué importancia asignó a cada
factor y cómo valoró cada subfactor; la clasificación FODA y la recomendación se
recalculan al consultarla.

Esto permite **recalcular cualquier evaluación histórica con una fórmula
distinta** sin volver a consultar al usuario, lo que hace posible comparar
variantes del método de forma objetiva. Un diseño que guardase el veredicto
A/B/C perdería esa capacidad de forma irreversible.

---

## 4. Funcionalidades nuevas

| Funcionalidad | Descripción |
|---|---|
| **Persistencia de evaluaciones** | Cada evaluación queda registrada con fecha y con los datos del software analizado |
| **Historial** | Consulta de evaluaciones anteriores y reapertura de su detalle completo |
| **Identificación del software** | Nombre, versión, tipo de licencia, proveedor, organización y evaluador, almacenados como campos consultables |
| **Panel de métricas** | Indicadores agregados de todas las evaluaciones: distribución de recomendaciones, ponderación media y factores problemáticos recurrentes |
| **Exportación a PDF** | Informe con la recomendación, la tabla de factores y la clasificación FODA |
| **Exportación a Excel** | Tres hojas con formato, autofiltro y colores por categoría |
| **Diagrama FODA** | Representación gráfica en cuatro cuadrantes con los factores de cada categoría |
| **Radar por dimensión** | Ponderación media comparada entre las dimensiones Tecnológica, Organizacional y Económica |
| **Continuidad de la evaluación** | El progreso se conserva al recargar la página |
| **Avance automático** | Al completar los subfactores de un factor, el asistente pasa al siguiente pendiente |

---

## 5. Mejoras de interfaz

| Antes | Ahora |
|---|---|
| Tres pestañas con pasos agrupados de dos en dos | Asistente de cuatro pasos con indicador de progreso |
| Deslizadores sin etiqueta visible | Selectores de cuatro opciones con el nombre de cada nivel |
| Sin indicación de qué falta por responder | Contadores de progreso y aviso antes de calcular con preguntas pendientes |
| Interfaz de escritorio de tamaño fijo | Diseño adaptable, con modo claro y oscuro |
| Resultados en tablas de texto | Tablas, diagrama FODA y gráfico radar |

Se corrigió además una regresión heredada: el **alcance** de cada factor
(interno o externo) había dejado de mostrarse durante la evaluación, pese a ser
el dato que determina si un factor acaba clasificado como Debilidad o como
Amenaza.

---

## 6. Lo que se preservó sin cambios

Tan importante como lo mejorado es lo que **no** se alteró. La metodología GUIOS
se implementa de forma fiel, verificada paso a paso contra la tesis doctoral:

- La matriz de **Importancia Relativa** (Figura 5.10 de la tesis) coincide en las
  16 combinaciones posibles.
- La regla de **selección de factores relevantes**.
- La **escala de cuatro niveles** para valorar los subfactores.
- El cálculo de la **ponderación media** de cada factor.
- La **clasificación FODA** y su umbral (Ecuación 5.3).
- El reparto de **factores internos y externos** (Tabla 5.4).
- Los **textos y las letras** de las recomendaciones A, B y C.
- Los **datos maestros**: 3 dimensiones, 18 factores y 61 subfactores, idénticos
  a los CSV originales.

El detalle de esta correspondencia está en `CHANGELOG.md` (v2.1.0).

---

## 7. Limitaciones conocidas

Documentadas de forma explícita, sin modificar el comportamiento del sistema:

- El nivel **Fundamental** de Importancia Relativa no puede alcanzarse, porque la
  Importancia del Experto vale 3 en los 18 factores del catálogo. Es una
  consecuencia de la calibración del instrumento, no de la implementación.
- El **paso 6** (recomendación A/B/C) es el único que la tesis no formaliza: su
  descripción admite una lectura por mayoría y otra por existencia.
- La respuesta **«Desconozco si cumple»** participa en el promedio con valor 2,
  tal como especifica la metodología.
- El esquema no impide almacenar la respuesta de un subfactor cuyo factor no fue
  evaluado; esa coherencia la garantiza la capa de aplicación.
- El **borrado en cascada** lo aplica el ORM y no el motor de base de datos.
