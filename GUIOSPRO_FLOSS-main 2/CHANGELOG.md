# CHANGELOG — GUIOSAD

Historial de cambios desde el sistema original (Python + flexx) hasta la versión actual (Django REST + React).

---

## v3.1.3 — El salto automático a resultados ya no pierde la última respuesta (2026-10-12)

### 🐞 «Hay 1 subfactor sin responder» con todo respondido

Al contestar la última pregunta pendiente, el paso Subfactores espera 750 ms y salta
solo a resultados. Ese salto llamaba al `onCompletado` capturado en el momento del
clic, es decir, al `handleCalcular` del render **anterior**, cuyo estado todavía no
incluía la respuesta recién dada. Consecuencias:

- El aviso previo al cálculo contaba un subfactor sin responder que sí estaba
  respondido.
- Si el decisor aceptaba continuar, esa última respuesta se enviaba como «No cumple
  el requisito» (valor 1) y con procedencia «manual», fuera cual fuera la que había
  elegido. El resultado guardado podía ser distinto del que correspondía.

Pulsar el botón «Ver Resultados» a mano no tenía el problema, porque usa el
`handleCalcular` del render en curso.

Ahora el temporizador llama siempre al `onCompletado` más reciente, de modo que el
cálculo ve todas las respuestas. Verificado con un padre que cuenta pendientes con su
propio estado: antes del arreglo veía 1 pendiente y 2 respuestas de 3; ahora ve 0 y
las 3.

---

## v3.1.2 — Elegir el alcance antes que la importancia ya no rompe el guardado (2026-10-12)

### 🐞 Un factor «Ambos» con alcance elegido pero sin importancia

En el paso Factores, si el decisor elegía Interno o Externo en un factor de alcance
«Ambos» **antes** de fijar su importancia, la entrada del factor quedaba creada sin
nivel. Dos cosas iban mal a partir de ahí:

- La interfaz daba el factor por ajustado: el botón «Irrelevante» se teñía como si lo
  hubiera elegido el decisor y el contador de factores ajustados lo sumaba.
- Al guardar, `importancia_decisor` viajaba sin valor, el servidor respondía 400 y la
  pantalla mostraba solo «Error al guardar evaluación», sin pista de la causa.

Ahora un factor cuenta como ajustado únicamente cuando tiene importancia elegida, de
modo que elegir solo el alcance lo deja en el gris de «valor por defecto», y al
guardar se envía la importancia mínima —la misma que muestra el formulario— si no se
fijó ninguna. El cálculo no cambia: es exactamente lo que ya ocurría con un factor
que no se tocaba en absoluto.

---

## v3.1.1 — Limpieza sin cambios de comportamiento (2026-10-12)

Pasada de limpieza sobre todo el código: se retira lo que no se usaba, se reutiliza
lo que estaba repetido y se simplifica lo que podía decirse más corto. **Ningún
resultado cambia**: la API devuelve exactamente las mismas respuestas, las pruebas
del motor y el experimento producen la misma salida y la interfaz se ve igual.

### 🧹 Backend

- `CAMPOS_SOFTWARE` pasa de `serializers.py` a `models.py`, junto a los campos que
  enumera, y `Evaluacion.datos_software()` sustituye a las tres copias del mismo
  diccionario que había en las vistas.
- Nuevo `DatosSoftwareSerializer`: los seis campos del software se declaran una vez
  y los heredan la creación/edición de evaluaciones y la petición de sugerencias al
  asistente, que antes los redeclaraba con sus `max_length`.
- `_validar_peticion()` reúne la validación que `POST` y `PUT` repetían línea a
  línea. Los errores se lanzan como `ValidationError`: el 400 y su cuerpo son los
  mismos de antes.
- El detalle de una evaluación lee valor y procedencia de cada respuesta en una
  consulta en vez de dos; el panel cuenta los factores relevantes de cada evaluación
  una vez en vez de dos.
- `resolver()` construye el resultado de cada factor en un solo bloque en lugar de
  dos casi idénticos (relevante / irrelevante).
- `respuestas_determinantes()` deja de restaurar al final una instantánea que ya
  restauraba tras cada alteración.
- `ia.disponible()` reutiliza `estado()` en vez de repetir sus tres comprobaciones;
  el informe ejecutivo deja de citar un recuento de «no concluyentes» que desapareció
  con el criterio retirado en la v3.0.0 y siempre valía 0.
- Pruebas del motor: se retiran una variable y una importación sin uso, y
  `services.py` se lee una vez en lugar de dos. La migración `0006` deja de importar
  `models`, que no usaba.

### 🧹 Frontend

- Nuevo `utils/software.js` con el estado vacío del formulario, el nombre de la
  evaluación y la conversión entre los nombres del formulario y los de la API. Antes
  el nombre se calculaba dos veces (paso inicial y página de evaluación) y la
  conversión estaba repartida en tres sitios.
- `api/guiosad.js`: todas las peticiones pasan por un mismo `pedir()`; se retira
  `getPlan()`, que ninguna pantalla usaba. Nueva `esRelevante()`, que sustituye a las
  tres copias de la misma regla en factores, subfactores y página de evaluación.
- `utils/recomendacion.js` gana `REC_V` (color del veredicto) y `FODA_PLURAL`; el
  panel, el historial, la flor FODA y la exportación los reutilizan en vez de llevar
  cada uno su tabla. La exportación reutiliza también su propia `estilarCabecera()`
  en la tabla resumen del Excel.
- `Stepper`: los estilos en línea pasan a CSS.
- `index.css`: se retiran la variable `--shadow` y las reglas `.card-body`,
  `.ficha-software`, `.ia-nota`, `.campo-pista` y `.historial-item`, ninguna
  referenciada; se funden los selectores definidos dos veces (`.ficha-etiqueta`,
  `.ficha-valor`, `.hist-tarjeta`, `.sub-panel-acciones` y el bloque de variables del
  tema claro) conservando el estilo efectivo; y se elimina una regla `@media` que no
  cambiaba nada.

### 📄 Documentación

- El README de la raíz del repositorio había dejado de ser cierto: enlazaba a
  `MEJORAS.md` y `MIGRACION_GUIOSAD.md`, retirados en la v2.2.0, y describía un
  arranque con `makemigrations` que ya no existe. Pasa a ser una portada breve que
  remite al README del proyecto.
- El README del proyecto indicaba `cd Procesos-` cuando `docker-compose.yml` está en
  `Procesos-/GUIOSPRO_FLOSS-main 2`. Se corrige la ruta y se sustituye, aquí y en
  `.env.example`, una mención al «contraste de criterios» retirado en la v3.0.0.

### ✅ Verificación

- `pruebas_motor.py` y `experimento_instrumento.py`: salida idéntica, byte a byte, a
  la de antes de la limpieza.
- Recorrido de extremo a extremo por los trece endpoints sobre SQLite (54
  peticiones: cinco evaluaciones con veredictos A, B, C y vacío, errores de
  validación, edición, borrado, panel e historial): las 54 respuestas son idénticas a
  las de antes.
- Cliente de la API y utilidades del frontend comprobados en Node con `fetch`
  simulado: mismas rutas, métodos, cuerpos y mensajes de error que antes.
- `manage.py check` y `makemigrations --check` sin avisos; `npm run build` sin errores.

---

## v3.1.0 — Panel, historial y paso inicial rediseñados (2026-10-05)

### 🐞 Un titular que se contradecía

El panel encabezaba con **«Buen panorama: solo el 15 % de factores en Debilidad o
Amenaza»** mientras, justo debajo, declaraba que **las 14 evaluaciones terminaban en
C**. El titular lo calculaba la proporción de factores desfavorables, que no es lo que
decide el veredicto: basta **un** factor importante desfavorable para que la
metodología emita una C, así que un porcentaje bajo convive sin problema con un 100 %
de recomendaciones C.

Ahora el titular lo manda el reparto de veredictos —lo que el decisor realmente
obtiene— y el porcentaje de factores pasa a ser la explicación de esa aparente
contradicción, en vez de ocultarla.

### 📊 Panel

Reconstruido con formas elegidas por el trabajo de cada dato, no por decoración:

| Dato | Forma | Por qué |
|---|---|---|
| Reparto de veredictos | **barra apilada de 100 %** con leyenda y cifras directas | es parte-de-un-todo con tres clases ordenadas; tres barras sueltas no mostraban el reparto |
| Factores que más fallan | **barras con énfasis** en el primero, resto en gris | son categorías sin orden natural: teñirlas por magnitud duplicaría en color lo que la longitud ya dice |
| Cumplimiento por dimensión | **medidores** con la marca del umbral 3,0 | es una razón contra un límite; además, este dato ya venía de la API y no se mostraba en ninguna parte |

Los gráficos pasan a ser HTML y CSS en lugar de una librería: cada valor lleva su
etiqueta visible, de modo que ninguno depende de un tooltip para poder leerse.

**Sobre los colores.** Validé las paletas con la herramienta de contraste en vez de
juzgarlas a ojo. El trío de veredictos que ya tenía el sistema resultó ser el mejor
—separación CVD ΔE 8,1; una alternativa más oscura que probé caía a 1,0, indistinguible
para un daltónico—, así que **se queda como estaba**. El trío de dimensiones pasa con
margen justo en modo claro (ΔE 7,8), lo que obliga a que cada color vaya siempre
acompañado de su etiqueta: así está. Y la rampa secuencial que llegué a validar acabó
descartada, porque para categorías sin orden es precisamente un error.

### 🗂 Historial

Dejaba media pantalla en blanco con un icono de cursor y escondía la lista tras un
botón. Ahora:

- Las evaluaciones se ven de entrada como **tarjetas** con su veredicto, fecha y
  organización, con un filete del color del resultado.
- **Buscador** por nombre u organización.
- La cabecera resume el reparto: *«14 guardadas · 0 adoptar, 0 con reservas, 14 posponer»*.
- Dentro del detalle, una fila para **saltar a otra evaluación** sin volver al listado.

### 📝 Paso inicial

El formulario plano se convierte en dos piezas: un panel que explica para qué sirven
esos datos —y deja claro que **no intervienen en el cálculo**— y el formulario, agrupado
en *El producto* y *Quién evalúa*. El panel muestra en vivo **con qué nombre se guardará
la evaluación**, para que no haya sorpresas en el historial.

### ✅ Verificación

Las tres pantallas se renderizaron y se revisaron en claro y en oscuro antes de darlas
por buenas, y la aplicación en marcha se comprobó con los componentes reales. Pruebas
del motor y de extremo a extremo sin fallos.

---

## v3.0.0 — Vuelta a una sola fórmula: la de la tesis (2026-10-05)

### Resumen

**Se retira el criterio de cálculo alternativo introducido en la v2.2.0.** El sistema
vuelve a implementar los seis pasos de la metodología tal como los define la tesis,
sin variantes ni parámetros que alteren ningún resultado.

Lo que se conserva —y se refuerza— es el **análisis del resultado**: en vez de comparar
dos fórmulas, ahora explica por qué el veredicto es el que es sobre la fórmula original.

---

### ⏪ Retirado

| Qué | Dónde |
|---|---|
| El criterio `guiosad_v2` y todo el aparato de criterios: `CRITERIOS`, `CRITERIO_POR_DEFECTO`, `obtener_criterio` y los parámetros `criterio` de todas las funciones | `services.py` |
| `comparar_criterios()` y el endpoint `GET /api/evaluaciones/{id}/comparar/` | motor y API |
| La columna `criterio` de `evaluaciones_evaluacion` (migración `0006`) | base de datos |
| El `PATCH` que cambiaba el criterio de una evaluación, y los `?criterio=` de los endpoints | API |
| Las categorías FODA «No concluyente» y «Sin datos», que solo producía el criterio retirado | motor e interfaz |

Las respuestas almacenadas **no se tocan**: siguen siendo lo único que la base de datos
guarda, y el resultado se deriva de ellas al consultarlas. Las evaluaciones anteriores
se resuelven ahora con la fórmula de la tesis, que es lo que hacían antes de la v2.2.0.

Una prueba nueva comprueba que en el motor **no quede ninguna variante de la fórmula**:
ni un diccionario de criterios, ni una clave del criterio retirado.

---

### 🔎 El análisis, reformulado

Donde antes había un contraste entre dos criterios, ahora hay un **diagnóstico** del
resultado obtenido. Nuevo `GET /api/evaluaciones/{id}/diagnostico/`:

- **Qué factores causan la recomendación** —los críticos si es C, los opcionales si es B—
  y, para cada uno, de dónde sale su clasificación: si refleja un incumplimiento
  comprobado, si descansa en respuestas «Desconozco si cumple», o si el factor se decide
  con una sola pregunta.
- **Avisos generales**: cuántas respuestas son «Desconozco» y qué pesan, qué factores
  desfavorables cuelgan de una única pregunta, cuáles quedan al borde del umbral.
- **Cobertura** de la evaluación: qué proporción de las respuestas se conoce realmente.
- Cuando la recomendación es **A**, el diagnóstico no desaparece: pasa a señalar lo que
  conviene vigilar aunque no impida adoptar.

Nada de esto recalcula nada. Es una lectura de un resultado ya obtenido.

---

### 🎨 Diseño

- **Fuera las tres pestañas del análisis.** Recordaban al prototipo original —que
  también se organizaba en tres pestañas— y obligaban a ir y venir. Ahora es un informe
  continuo: cifras de cabecera, factores que lo causan, qué haría falta, respuestas que
  lo deciden y avisos, todo a la vista y en orden.
- **Pantalla de evaluación rediseñada.** El índice de factores pasa de lista plana a
  tarjetas con su estado; el panel gana jerarquía tipográfica; cada criterio se presenta
  en una rejilla con su número y su escala, que ahora se lee como una escala y no como
  cuatro botones genéricos.
- **El diagrama FODA no se ha tocado**, ni su componente ni sus clases.

---

### ✅ Verificación

- `pruebas_motor.py` sin fallos, con la sección del contraste sustituida por la del
  diagnóstico y una comprobación nueva de que no exista variante de la fórmula.
- Prueba de extremo a extremo sin fallos: el resultado usa la fórmula de la tesis
  —«Desconozco» promedia como 2 y arrastra el factor—, el diagnóstico parte de ese
  resultado, y el endpoint de contraste devuelve 404.
- `experimento_criterios.py` pasa a `experimento_instrumento.py`: ya no compara dos
  fórmulas, mide a qué responde la de la tesis. El hallazgo, sobre 270 evaluaciones:
  basta con que el 30 % de los criterios queden sin conocer para que la recomendación A
  deje de aparecer, y un producto mediocre y uno malo producen la misma distribución de
  resultados. Está comentado en el apartado 5 de [PROPUESTA.md](PROPUESTA.md).

---

## v2.4.0 — El criterio propuesto pasa a ser el predeterminado (2026-10-05)

### Resumen

El resultado principal se calcula ahora con el **criterio propuesto**, y el de la tesis
baja al panel de análisis como contraste permanente. Es la consecuencia de la medición
de la v2.3.0, no una preferencia: hasta que hubo cifras, el predeterminado era el de la
tesis porque no había razón documentada para apartarse de él.

**El criterio de la tesis no se ha modificado.** Se calcula en toda evaluación, aparece
en cada contraste, las pruebas verifican que sigue reproduciendo su matriz de importancia
relativa y sus textos, y basta un clic para volver a él.

---

### 🔁 Cambio de criterio predeterminado

| | Antes | Ahora |
|---|---|---|
| Resultado principal | Criterio de la tesis | **Criterio propuesto** |
| En el panel de análisis | Criterio propuesto, como alternativa | **Criterio de la tesis**, como referencia |

- `CRITERIO_POR_DEFECTO` pasa a `guiosad_v2`, con la justificación y el enlace a la
  medición en el propio código. Se añaden las constantes `CRITERIO_TESIS` y
  `CRITERIO_PROPUESTO` para que ninguna otra parte repita la cadena.
- El banner de resultados indica con qué criterio se calculó. Antes no hacía falta
  porque solo había uno por omisión; ahora es un dato que el decisor necesita ver.
- `comparar_criterios` devuelve `criterio_aplicado` y `criterio_contraste`. El cálculo
  mantiene el orden canónico —tesis y después propuesto— para que los motivos de cada
  cambio se expliquen siempre en el mismo sentido; lo que se reordena es la presentación.

### ↩️ Aplicado a lo ya evaluado

Migración `0005`, con marcha atrás. Las evaluaciones guardadas se recalculan con el
criterio nuevo: **ninguna respuesta se toca**, solo con qué criterio se resuelven. No se
reescribe una decisión de nadie —ningún decisor había elegido criterio, todas heredaban
el valor por omisión de la migración `0003`— y volver atrás es un `migrate` o un clic en
cualquier evaluación.

Comprobado sobre la base de datos en marcha: una evaluación que estaba en C pasó a B al
migrar, con las mismas respuestas.

### 🐞 Corregido

Cuando **ningún factor cambiaba de clasificación pero la recomendación sí**, el panel
decía solo «Ningún factor cambia de clasificación» y no explicaba nada más: el caso más
desconcertante del contraste se quedaba sin explicación. Ahora dice que la diferencia
está en el último paso y en qué consiste. Es, además, exactamente el caso que se da al
aplicar el criterio nuevo a evaluaciones ya guardadas.

### 🎨 Diseño

Refresco de la pantalla de resultados y del panel de análisis. **El diagrama FODA se deja
intacto**, igual que su componente y sus clases.

- **Banner de recomendación** — era un bloque de color saturado con el texto forzado a
  blanco. Ahora es una tarjeta del tema con un filete del color del veredicto: se lee
  igual de bien en claro y en oscuro, y deja sitio para la etiqueta del criterio
  aplicado. Desaparecen las tres sobrecargas de modo claro que hacían falta antes.
- **Los dos veredictos del contraste** pasan a ser tarjetas enfrentadas, con el criterio
  aplicado resaltado y una separación «frente a» en vez de una flecha, que sugería una
  transformación donde solo hay comparación.
- **Tablas** — cabecera fija al desplazar, más aire entre filas, tipografía de cabecera
  más legible.
- **Tarjetas** — se sustituye el `backdrop-filter` por una sombra sutil, con tokens
  propios para los dos temas.
- **Badges** — esquinas suavizadas en vez de píldora, para distinguirlos de los botones.

---

### ✅ Verificación

- `pruebas_motor.py` sin fallos. La prueba que afirmaba que el predeterminado era el de
  la tesis se actualizó y se amplió: ahora comprueba además que el de la tesis sigue
  disponible, que su configuración no se ha tocado, y que la constante del modelo y la
  del motor no se han separado.
- Prueba de extremo a extremo sin fallos, con los dos criterios ejercitados sobre las
  mismas respuestas.
- Migración `0005` aplicada y comprobada sobre datos reales, en los dos sentidos.

---

## v2.3.0 — Resultados medidos, salto automático y asistencia con IA (2026-10-05)

### Resumen

Tres cosas: se **mide** por fin la diferencia entre los dos criterios de cálculo en
lugar de razonarla, se corrige el salto a Resultados al completar la evaluación, y se
implementa el **módulo de asistencia con IA** que hasta ahora solo estaba descrito.
El criterio de la tesis sigue siendo el predeterminado y no se ha tocado.

---

### 📊 Resultados del contraste de criterios

Nuevo `backend/recomendaciones/experimento_criterios.py`: genera **270 evaluaciones**
sobre el catálogo real cruzando perfil de cumplimiento × desconocimiento × importancia,
las resuelve con ambos criterios y cuantifica la diferencia. Reproducible por semilla y
sin consumir la API. El análisis completo está en el apartado 5 de
**[PROPUESTA.md](PROPUESTA.md)**; el hallazgo central:

| | Criterio de la tesis | Criterio propuesto |
|---|---|---|
| Recomendación C cuando no se desconoce nada | 44,4 % | 55,6 % |
| Recomendación C cuando se desconoce la mitad | **66,7 %** | 53,3 % |
| Recomendación C con software que cumple todo lo conocido | **45,6 %** | **0,0 %** |
| Recomendación A con ese mismo software | 21,1 % | **100,0 %** |

Es decir: **con el criterio de la tesis el veredicto sigue al desconocimiento del
evaluador y apenas distingue la calidad del software; con el propuesto ocurre lo
contrario.** Los dos criterios difieren en el 53 % de las evaluaciones, y las diferencias
van siempre en el sentido de ser menos restrictivo: ninguna evaluación calificada de A
por la tesis baja con el criterio propuesto.

Confirmado además de forma empírica lo que el apartado 2 dedujo leyendo el catálogo:
los cinco factores que más cambian de clasificación son **exactamente los cinco de un
solo subfactor**.

Se documenta también un efecto no previsto: la banda de indecisión explica el 55 % de
las diferencias, porque los factores de uno o dos subfactores producen ponderaciones que
caen exactamente en 3,0. Queda registrado en el apartado 5.4 en lugar de ajustarse en
silencio.

---

### 🔀 Salto automático a Resultados

Al responder el último criterio pendiente, el asistente pasaba al siguiente factor pero
**no hacía nada cuando ya no quedaba ninguno**: había que pulsar «Ver Resultados». Ahora
la evaluación se calcula y se muestra sola. `handleCalcular` ignora la segunda llamada
si ya hay un cálculo en curso, para que el salto automático y el botón no disparen dos.

---

### 🤖 Asistencia con inteligencia artificial

Nuevo `backend/recomendaciones/ia.py` sobre el SDK oficial de Anthropic
(`anthropic==1.11.0`, modelo `claude-opus-5-5`), con tres funciones:

| Requisito | Qué hace |
|---|---|
| **RF-17** | Propone una valoración para cada subfactor de un factor, con justificación y nivel de confianza. Salida estructurada validada por esquema JSON |
| **RF-18** | Redacta el informe ejecutivo a partir del resultado ya calculado |
| **RF-24** | Convierte en plan de acción el conjunto mínimo de cambios que el motor calcula de forma determinista |
| **RF-19** | Columna `origen` en `evaluaciones_evaluacionsubfactor` (migración `0004`): distingue la respuesta del decisor de la que procede de una sugerencia aceptada |

**Las tres condiciones de diseño, con mecanismo detrás:**

- *No participa en el cálculo* — `services.py` no importa `ia.py`, y una prueba
  comprueba que ese import no aparezca. La dependencia va en un solo sentido.
- *No decide* — los endpoints del asistente no escriben: devuelven propuestas. Lo que
  se guarda pasa por el mismo camino que una respuesta manual.
- *Deja rastro* — la columna `origen` registra la procedencia de cada respuesta.

**El catálogo lo decide el servidor, no el modelo:** las sugerencias se piden por
`factor_id` y los subfactores se leen de la base de datos. Una respuesta que mencione un
criterio inexistente, repita uno o proponga un valor fuera de la escala 1–4 se descarta
antes de llegar al decisor.

**Degradación comprobada (RNF-13, RNF-16):** sin `ANTHROPIC_API_KEY` la interfaz no
ofrece el asistente, los endpoints devuelven 503 con el motivo, y el plan de mejora llega
igualmente con su cálculo completo y una nota de que no se pudo redactar.

Endpoints nuevos: `GET /api/recomendaciones/ia/estado/`,
`POST /api/recomendaciones/ia/sugerencias/`, `POST /api/evaluaciones/{id}/informe/` y
`POST /api/evaluaciones/{id}/plan/`.

---

### 🧹 Código

- Nuevo `backend/recomendaciones/catalogo_local.py` con el catálogo en memoria y los
  dobles del ORM: lo comparten las pruebas y el experimento, que antes habrían tenido
  cada uno su copia.
- Corregido un fallo de reproducibilidad en el experimento: usaba `hash()` sobre
  cadenas, que Python aleatoriza en cada proceso. Ahora deriva la semilla con `crc32`,
  de modo que dos ejecuciones distintas dan exactamente las mismas cifras.

---

### ✅ Verificación

- `pruebas_motor.py` sin fallos, con una sección nueva que comprueba la invariante de
  que la IA no toca el cálculo y la validación de lo que devuelve el modelo.
- Prueba de extremo a extremo contra los tres contenedores sin fallos, incluida la
  degradación del asistente sin credencial.
- `experimento_criterios.py` reproducible: dos ejecuciones en procesos distintos dan
  idéntica salida.
- **Lo que no está verificado:** la llamada real al proveedor del modelo. Todo lo que no
  depende de la red está probado; ejercitar la API requiere una clave, que se configura
  como explica el README.

---

## v2.2.0 — Contraste de criterios, Docker reproducible y limpieza (2026-10-05)

### Resumen

Esta versión lleva al sistema la propuesta descrita en **[PROPUESTA.md](PROPUESTA.md)**:
el motor pasa a estar parametrizado por criterio de cálculo y la interfaz gana un
panel que explica de qué depende la recomendación. **El criterio de la tesis sigue
siendo el predeterminado y no se ha modificado**: las evaluaciones guardadas antes
de esta versión conservan exactamente la misma recomendación A/B/C.

---

### 🆕 La propuesta, implementada

| Requisito | Qué se añadió |
|---|---|
| **RF-20** | El motor acepta un criterio de cálculo identificado por su nombre. Se incorporan `tesis_2022` (predeterminado, congelado) y `guiosad_v2` (propuesto). Difieren solo en los pasos 4, 5 y 6; los pasos 2 y 3 son idénticos |
| **RF-21** | Cada evaluación registra el criterio declarado. Columna `criterio` en `evaluaciones_evaluacion` (migración `0003`), aceptada al crear y modificable con `PATCH /api/evaluaciones/{id}/` |
| **RF-22** | `GET /api/evaluaciones/{id}/comparar/` resuelve la evaluación con ambos criterios y señala qué factores cambian de clasificación, con qué ponderación en cada uno y por qué motivo |
| **RF-23** | `GET /api/evaluaciones/{id}/determinantes/` localiza las respuestas que, contestadas de otro modo, alterarían por sí solas la recomendación |
| **RF-24** | `GET /api/evaluaciones/{id}/plan/` calcula el conjunto mínimo de cambios que llevaría a una recomendación mejor. El objetivo se simula, no se supone: resolver los bloqueantes puede saltar más de un escalón |

**Panel de análisis en la interfaz.** Botón «Analizar el resultado» en la pantalla
de Resultados y en el detalle del historial, con tres pestañas que consultan cada
endpoint una sola vez. Componente nuevo `frontend/src/components/AnalisisResultado.jsx`.

**Dos categorías FODA nuevas**, que solo aparecen con el criterio propuesto:
*No concluyente* (ponderación dentro de la banda de indecisión) y *Sin datos* (no
se conoce ninguno de los subfactores del factor). La segunda evita que el
desconocimiento del evaluador se convierta en una debilidad fabricada.

El contraste **no exigió ninguna columna nueva**: recalcula sobre las respuestas ya
almacenadas. La columna `criterio` solo deja constancia de cuál declaró el decisor.

---

### ⚡ Rendimiento

| Problema | Corrección | Efecto |
|---|---|---|
| El historial y el panel de métricas resolvían cada evaluación por separado: **dos consultas por evaluación** | Lectura por lotes (`instantaneas()`), con el ensamblado compartido con la versión de una sola evaluación | **Dos consultas constantes** en vez de 2·N. Con cien evaluaciones, de 200 consultas a 2 |
| Guardar una evaluación hacía **una lectura y una escritura por subfactor** (hasta 122 consultas) | `bulk_create` para factores y subfactores, con validación previa en bloque | **Dos inserciones** en total |
| La librería de gráficos (~350 KB) entraba en el paquete inicial aunque no se usara en el primer paso | Carga diferida de `DashboardPage` y `RadarDimensiones` | Paquete inicial de **588 kB → 182 kB** (gzip: 168 kB → 57 kB) |

---

### 🐳 Docker y reproducibilidad

| Antes | Ahora |
|---|---|
| El contenedor ejecutaba `makemigrations` en cada arranque: el esquema se generaba en tiempo de ejecución y podía diferir entre equipos | Las migraciones están **versionadas**; el arranque solo ejecuta `migrate`. Se retiró `*/migrations/` del `.gitignore`, que contradecía el RNF-09 |
| Sin `.dockerignore`: `node_modules` y `__pycache__` entraban en el contexto de construcción | `.dockerignore` en `backend/` y `frontend/` |
| `npm install` en la imagen del frontend | `npm ci`, que respeta `package-lock.json` |
| Credenciales fijas en `docker-compose.yml` | Variables con valor por defecto (`${VAR:-...}`) y `.env.example`. Sigue arrancando sin ningún `.env` |
| El frontend arrancaba sin esperar al backend | Healthcheck del backend contra `/api/factores/` —que solo responde con la base de datos migrada y sembrada— y `depends_on: service_healthy` encadenado |
| Dockerfile del backend sin ajustes de entorno | `PYTHONDONTWRITEBYTECODE` y `PYTHONUNBUFFERED`; gunicorn con 2 trabajadores y `--timeout 60` |

---

### 🧹 Código y estructura

- **Documentación reducida a tres ficheros**: `README.md` (qué es y cómo
  ejecutarlo), `PROPUESTA.md` (la propuesta del sistema) y este historial. Se
  eliminaron `MEJORAS.md` y `MIGRACION_GUIOSAD.md`, cuyo contenido se integró en
  los dos primeros.
- **Etiquetas de recomendación y FODA unificadas** en `frontend/src/utils/recomendacion.js`:
  antes estaban duplicadas en la tabla de resultados.
- **Las pruebas del motor ya no dependen de `proyecto base 0/`**, que está fuera del
  repositorio. Ahora leen el catálogo de las mismas fixtures con las que se siembra
  PostgreSQL, de modo que prueba y sistema comparten los datos.
- **Zona horaria** corregida a `America/Guayaquil` (estaba en `America/Mexico_City`).
- Corregido un dato erróneo de este mismo historial: la importancia sugerida no
  vale 3 en los dieciocho factores, sino 3 en nueve y 2 en los otros nueve.

---

### ✅ Verificación

- `backend/recomendaciones/pruebas_motor.py` — sin fallos. Comprueban que el
  criterio de la tesis sigue reproduciendo sus 16 combinaciones de importancia
  relativa y sus textos de recomendación (RNF-15), y que los cinco límites de
  calibración documentados se cumplen sobre el catálogo real.
- Prueba de extremo a extremo contra los tres contenedores: catálogo servido,
  evaluación creada, contraste, sensibilidad, plan, cambio de criterio declarado,
  rechazo de un criterio inexistente, historial y panel de métricas. Sin fallos.
- `docker compose up --build` desde cero: los tres servicios arrancan encadenados y
  el sistema queda operativo sin intervención manual.

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
| La importancia sugerida solo vale 2 o 3 (nueve factores cada una) | El nivel **Fundamental** es inalcanzable: `IR` necesita `IS=4` e `ID=4` |
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
Importancia Sugerida solo toma dos valores en el catálogo —3 en nueve factores y 2
en los otros nueve—, de modo que la Importancia Relativa nunca llega a 4. No es un
defecto de la implementación sino una consecuencia de cómo quedó calibrado el
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
