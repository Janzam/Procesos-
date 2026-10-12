# Propuesta del sistema — GUIOSAD v2

Qué propone este sistema, por qué, y qué parte está construida.

Todos los datos de este documento están verificados contra el código fuente de
ambos sistemas, contra el catálogo de datos del prototipo y contra la tesis
doctoral que define la metodología.

> Referencia: Rea Sánchez, V. H. (2022). *Factores para la adopción de soluciones
> basadas en software libre y fuentes abiertas* [Tesis doctoral, Universidad de
> Sevilla].

> **La fórmula no se toca.** El sistema implementa los seis pasos de la metodología
> tal como los define la tesis y tal como los ejecuta el prototipo original. No hay
> criterio alternativo, variante ni parámetro que cambie ningún resultado. Lo que el
> proyecto añade es que ese resultado se pueda **explicar**.

---

## 1. Punto de partida

El sistema base, **GUIOS PRO**, era una aplicación monolítica de escritorio con
`flexx` y `pandas`: se ejecutaba `main.py` (385 líneas) para generar un fichero
`guiosad.html` autocontenido de 422 KB que después se abría en el navegador.

| Aspecto | Sistema original |
|---|---|
| Ejecución | Python 3.9, PyCharm y librerías instaladas a mano |
| Interfaz | Tres pestañas con tablas planas y deslizadores |
| Almacenamiento | Ninguno: cada evaluación se perdía al cerrar |
| Datos maestros | Dos ficheros CSV separados por tabuladores |
| Distribución | Regenerar el HTML ejecutando el script |

### Defectos verificados del prototipo

No son juicios de valor: son fallos comprobados leyendo y ejecutando el código.

| Defecto | Evidencia | Efecto |
|---|---|---|
| La recomendación no funcionaba | `a, b, c = False` (`main.py`, línea 351) lanza `TypeError` en Python 3 | Pulsar «Ver recomendación» interrumpía la ejecución |
| Búsqueda de un número en una lista de textos | `Guiosad.levels_lbls.index(r)` con `r` entero (línea 34) lanza `ValueError` | La función que decidía la relevancia de un factor quedaba sin uso |
| Formato numérico inválido | `"{:.1f}".format(str(global_weight))` (línea 247) lanza `ValueError` | La ponderación media no llegaba a mostrarse |
| Dos reglas de recomendación superpuestas | Un criterio por mayoría y, debajo, otro por existencia que sobrescribe el resultado | Quedaba sin determinar cuál era la regla vigente |
| Tres umbrales de relevancia distintos | `r > 0`, `r > 1` y `r > 2` en sitios diferentes | Solo uno se ejecutaba; los otros dos eran código muerto que lo contradecía |
| Sin persistencia | No existía base de datos | Imposible revisar, comparar ni auditar una evaluación anterior |

Corregir esos defectos **no cambia la metodología**: la hace funcionar. El sistema
nuevo ejecuta los seis pasos completos, que es algo que el prototipo no llegaba a
hacer.

---

## 2. El método, y qué se observa al aplicarlo

La metodología resuelve la evaluación en seis pasos. El sistema los reproduce sin
alterarlos.

| Paso | Qué hace |
|---|---|
| 1 | Registrar el software evaluado (no interviene en el cálculo) |
| 2 | Combinar la importancia que sugiere la guía con la que asigna el decisor → **importancia relativa** |
| 3 | Descartar los factores de importancia relativa irrelevante |
| 4 | Promediar las valoraciones de los subfactores → **ponderación media** |
| 5 | Clasificar en la matriz **FODA** según la ponderación y el alcance del factor |
| 6 | Emitir la **recomendación** A, B o C |

### Lo que se observa al contar el catálogo

El catálogo tiene **3 dimensiones, 18 factores y 61 subfactores**, repartidos de
forma muy desigual: Tecnológica 9 factores y 40 subfactores, Organizacional 8 y 19,
Económica 1 y 2.

| Observación | Consecuencia sobre el cálculo |
|---|---|
| La importancia sugerida solo toma dos valores: **nueve factores en «importante» y nueve en «opcional»**. Ninguno en irrelevante ni en fundamental. | Al combinarse en la matriz del paso 2 solo se alcanzan sus dos filas centrales: **el nivel «fundamental» es inalcanzable**, responda lo que responda el decisor. |
| Los nueve factores de importancia sugerida «importante» dan al menos «opcional» para cualquier respuesta posible. | **La mitad del catálogo no puede descartarse** en el paso 3, ni aunque el decisor la declare irrelevante. |
| Cinco factores —Prueba, Mantenibilidad, Apoyo de la alta dirección, Bloqueo de proveedores y Casos de estudio de adopción FLOSS— tienen **un único subfactor**. | Su ponderación es la respuesta a una sola pregunta. Como el umbral está en 3,0, responder «desconozco si cumple» produce en ellos **exactamente el mismo resultado que «no cumple»**. |
| El número de subfactores por factor va de **uno a once**. | Una respuesta desfavorable en un factor de un solo subfactor mueve su ponderación once veces más que la misma respuesta en Documentación. |
| La dimensión económica se decide con **dos subfactores de 61**. | El radar compara tres magnitudes calculadas sobre soportes muy desiguales. |

Ninguna de estas observaciones es un error: el prototipo reproduce aquí lo que la
metodología define, y el sistema nuevo también. Son **límites de calibración del
instrumento**, y la propia tesis admite que existen formas de cálculo que
aprovecharían mejor los valores intermedios de las escalas (p. 88).

Hay además un punto de otra naturaleza: **el paso 6 es el único que la tesis no
formaliza mediante una expresión**. Su texto describe la recomendación C en términos
de *mayoría* y la B en términos de *existencia*. El prototipo implementa existencia en
ambas, y el sistema nuevo conserva esa misma regla **documentando la ambigüedad en
lugar de resolverla por su cuenta**.

---

## 3. La idea central

> **No basta con entregar la recomendación: el decisor tiene que entender de dónde sale.**

Una letra A, B o C sin explicación obliga a aceptarla o a desconfiar de ella, sin
camino intermedio. Y en esta metodología hay un motivo adicional para explicarla: el
apartado 2 muestra que el resultado puede estar sostenido por muy poca información
—una sola pregunta, o un puñado de respuestas «Desconozco si cumple»— sin que el
decisor tenga forma de saberlo.

De modo que el proyecto **no cambia el cálculo: cambia lo que el decisor ve del
cálculo.** El sistema aplica la fórmula de la tesis y, junto al veredicto, responde
tres preguntas que la herramienta original no respondía:

1. **¿Qué factores están causando este resultado?**
2. **¿De qué información depende cada uno de ellos?**
3. **¿Qué haría falta para que el resultado fuera otro?**

Eso es todo el añadido. No hay fórmula alternativa que defender ante el autor de la
metodología, porque no se ha escrito ninguna.

---

## 4. Las tres funciones que materializan la idea

| Función | Qué hace |
|---|---|
| **Diagnóstico del resultado** | Enumera los factores que causan la recomendación obtenida y explica, para cada uno, de dónde sale su clasificación: si refleja un incumplimiento comprobado, si descansa en respuestas «Desconozco», o si el factor se decide con una sola pregunta |
| **Respuestas determinantes** | Localiza las respuestas que, contestadas de otro modo, alterarían por sí solas la recomendación final |
| **Plan de mejora** | Calcula el conjunto mínimo de cambios que llevaría a una recomendación mejor: qué factores lo impiden, qué ponderación necesitarían y cuántos criterios tendrían que subir |

Las tres **leen un resultado ya calculado**. Ninguna modifica una ponderación, una
clasificación ni una recomendación. Cuando la evaluación permite adoptar, el
diagnóstico no desaparece: pasa a señalar los puntos que conviene vigilar aunque no
bloqueen la decisión.

### Ejemplo real

Una evaluación donde el decisor no conoce el único criterio de *Mantenibilidad*:

```
Recomendación C — Por qué no se recomienda adoptar todavía

  Mantenibilidad    Amenaza    ponderación 1,0  (umbral 3,0)
     Depende de una sola pregunta: la clasificación del factor es la
     respuesta a ese único criterio.

  A tener en cuenta
   · 12 de las 59 respuestas que entran en el cálculo son «Desconozco si
     cumple». La metodología las promedia como un 2, de modo que esa parte
     del resultado mide lo que no se sabe del producto, no lo que incumple.
   · 2 de los factores desfavorables se deciden con una sola pregunta.
```

El veredicto es el de la metodología, sin tocar. Lo que se añade es saber que
descansa en una pregunta que el evaluador no supo responder.

---

## 5. Cómo se comporta el instrumento, medido

El guion `backend/recomendaciones/experimento_instrumento.py` aplica la metodología
**tal como está** a **270 evaluaciones sintéticas** sobre el catálogo real, cruzando
perfil de cumplimiento × desconocimiento × importancia. Es reproducible: misma
semilla, mismas cifras.

```bash
python backend/recomendaciones/experimento_instrumento.py
```

No ensaya ninguna fórmula alternativa. Contesta una sola pregunta: **cuando cambia la
recomendación, ¿cambia porque el software es mejor o peor, o porque el evaluador sabe
más o menos sobre él?**

### 5.1 Qué recomienda

| Recomendación | Evaluaciones | Proporción |
|---|---|---|
| A · adoptar | 19 | 7,0 % |
| B · adoptar con reservas | 90 | 33,3 % |
| C · posponer | 161 | 59,6 % |

### 5.2 Efecto del desconocimiento del evaluador

El software no cambia entre filas: solo cambia cuánto se sabe de él.

| Criterios sin conocer | A | B | C |
|---|---|---|---|
| 0 % | **33,3 %** | 22,2 % | 44,4 % |
| 10 % | 4,4 % | 42,2 % | 53,3 % |
| 20 % | 4,4 % | 33,3 % | 62,2 % |
| 30 % | **0,0 %** | 35,6 % | 64,4 % |
| 40 % | 0,0 % | 33,3 % | 66,7 % |
| 50 % | 0,0 % | 33,3 % | 66,7 % |

### 5.3 Efecto de la calidad del software

Lo mismo, variando cómo responde el decisor a lo que sí conoce.

| Perfil de cumplimiento | A | B | C |
|---|---|---|---|
| favorable | 21,1 % | 33,3 % | 45,6 % |
| mixto | 0,0 % | 33,3 % | **66,7 %** |
| adverso | 0,0 % | 33,3 % | **66,7 %** |

### 5.4 Qué dicen las dos tablas

> **El desconocimiento del evaluador mueve el veredicto más que la calidad del
> software.** Basta con que un 30 % de los criterios queden sin conocer para que la
> recomendación A deje de aparecer por completo. En cambio, un producto mediocre y uno
> francamente malo producen exactamente la misma distribución de resultados (66,7 % de
> recomendaciones C en ambos): **en ese tramo el instrumento no los distingue.**

La causa está identificada en el apartado 2 y no es un defecto de implementación: la
respuesta «Desconozco si cumple» ocupa el segundo nivel de la escala y la metodología
la promedia como un 2, igual que un incumplimiento parcial.

**Esto no se corrige cambiando la fórmula.** Se corrige haciendo que el decisor sepa
cuándo le está pasando, que es exactamente lo que hace el diagnóstico del apartado 4:
avisar de cuántas respuestas son «Desconozco», qué factores se deciden con una sola
pregunta y cuáles sostienen el veredicto.

### 5.5 Cuánta información sostiene cada resultado

- **24,9 %** de las respuestas que entran en los promedios son «Desconozco si cumple».
- En **459** ocasiones un factor se clasificó **sin conocer ninguno** de sus criterios:
  su ponderación de 2,0 y la clasificación desfavorable que produce salen enteramente
  del desconocimiento del evaluador.
- Una sola respuesta distinta bastaría para cambiar la recomendación en el **16,7 %**
  de los casos.

### 5.6 Qué vale y qué no vale este experimento

- Las evaluaciones son **sintéticas**, no respuestas de decisores reales. Lo que se
  mide es el comportamiento del instrumento ante entradas controladas, no el acierto
  de sus recomendaciones.
- El perfil de cumplimiento y el desconocimiento se generan de forma independiente,
  cuando en la realidad probablemente se correlacionen.
- La validación con evaluaciones reales sigue pendiente. El sistema la permite sin
  trabajo adicional, porque la base de datos guarda las respuestas y no los veredictos.

---

## 6. La decisión de diseño que lo hace posible

La base de datos **almacena únicamente las respuestas del decisor, nunca los
resultados calculados**. Cada evaluación guarda qué importancia asignó a cada factor y
cómo valoró cada subfactor; la importancia relativa, la ponderación, la clasificación
FODA y la recomendación se derivan al consultarla.

De ahí se sigue el diagnóstico: el sistema puede volver a resolver la evaluación
tantas veces como haga falta —alterando una respuesta para ver si el veredicto cambia,
o calculando cuántas tendrían que mejorar— sin preguntar nada al decisor. Un diseño
que guardara la letra A, B o C perdería esa capacidad de forma irreversible.

Otras decisiones que la acompañan:

- **La fórmula vive en un solo sitio.** Todo el cálculo está en
  `backend/recomendaciones/services.py`. El frontend no reimplementa nada: incluso la
  matriz de importancia relativa la consulta al servidor, para que las dos copias no
  puedan divergir.
- **El diagnóstico está separado del cálculo.** En el mismo módulo, pero por debajo:
  lee el resultado y no lo altera.
- **El análisis es determinista.** El diagnóstico, la sensibilidad y el plan mínimo se
  calculan en el servidor sin intervención de ningún modelo de lenguaje, y siguen
  disponibles con el asistente desactivado.

---

## 7. Qué se preservó sin cambios

Tan importante como lo mejorado es lo que **no** se alteró. Verificado paso a paso
contra la tesis, y comprobado por las pruebas en cada ejecución:

- La matriz de **importancia relativa** coincide en las 16 combinaciones posibles.
- La regla de **selección de factores relevantes**.
- La **escala de cuatro niveles** de los subfactores, con «Desconozco si cumple»
  valiendo 2 en el promedio.
- El cálculo de la **ponderación media**.
- La **clasificación FODA** y su umbral en 3,0.
- El reparto de factores **internos y externos**.
- La **regla del paso 6** y los **textos y las letras** de las recomendaciones A, B y C.
- Los **datos maestros**: 3 dimensiones, 18 factores y 61 subfactores, idénticos a los
  CSV originales.

Una de las pruebas comprueba, además, que en el motor **no exista ninguna variante de
la fórmula**: ni un diccionario de criterios, ni un parámetro que la altere.

---

## 8. El módulo de asistencia con IA

Tres funciones, todas **posteriores al cálculo**, de modo que el modelo de lenguaje no
puede alterar la matemática:

1. **Asistente de evidencia** — a partir del nombre, versión, licencia y proveedor,
   propone para cada subfactor una valoración razonada con su nivel de confianza. El
   decisor acepta, corrige o ignora. Ataca directamente el problema que mide el
   apartado 5: reduce la cantidad de «Desconozco si cumple» sin tocar cómo se promedian.
2. **Informe ejecutivo** — redacta en prosa el resultado FODA y la recomendación.
3. **Plan de acción** — redacta como secuencia de acciones el conjunto mínimo de
   cambios que el motor ya calcula de forma determinista.

### Las tres condiciones, y cómo se garantizan

| Condición | Cómo se garantiza |
|---|---|
| **No participa en el cálculo** | El módulo vive en `recomendaciones/ia.py` y `services.py` **no lo importa**. Una prueba comprueba que ese import no aparezca |
| **No decide** | Los endpoints del asistente no escriben en la base de datos: devuelven propuestas. La respuesta solo se guarda cuando el decisor la acepta, y pasa por el mismo camino que una manual |
| **Deja rastro** | Cada respuesta almacenada lleva su procedencia en la columna `origen`, con valores `manual` o `sugerido_ia` |

Además, **el catálogo lo decide el servidor, no el modelo**: las sugerencias se piden
por `factor_id` y los subfactores se leen de la base de datos, de modo que una
respuesta que mencione un criterio inexistente, repita uno o proponga un valor fuera de
la escala 1–4 se descarta antes de llegar al decisor.

### Si el asistente no está configurado

El sistema funciona igual. Sin `ANTHROPIC_API_KEY` la interfaz no lo ofrece, y el
diagnóstico, el análisis de sensibilidad y el plan de mejora siguen calculándose porque
son deterministas.

---

## 9. Estado de la implementación

| Requisito | Estado |
|---|---|
| Catálogo, captura, cálculo de los seis pasos, persistencia, historial, visualizaciones, exportación y métricas | Implementado |
| Diagnóstico del resultado | Implementado |
| Respuestas determinantes | Implementado |
| Plan de mejora (conjunto mínimo de cambios) | Implementado |
| Asistente de evidencia, informe ejecutivo y plan redactado | Implementado |
| Procedencia de cada respuesta almacenada | Implementado |

La llamada al proveedor del modelo está escrita y verificada en todo lo que no depende
de la red —validación de la respuesta, descarte de lo que no encaja con el catálogo, y
degradación sin credencial—, pero **no se ha ejercitado contra el proveedor real**:
hacerlo requiere una clave de API, que se configura según explica el README.

---

## 10. Limitaciones conocidas

Documentadas de forma explícita, sin modificar el comportamiento del sistema:

- El nivel **fundamental** de importancia relativa no puede alcanzarse, porque la
  importancia sugerida solo vale 2 o 3 en el catálogo.
- El **paso 6** admite dos lecturas. El sistema implementa la del código original y
  documenta la ambigüedad.
- **«Desconozco si cumple»** participa en el promedio con valor 2, tal como especifica
  la metodología. El apartado 5 mide lo que eso provoca; el diagnóstico avisa de cuándo
  está ocurriendo.
- El esquema no impide almacenar la respuesta de un subfactor cuyo factor no fue
  evaluado; esa coherencia la garantiza la capa de aplicación.
- El **borrado en cascada** lo aplica el ORM de Django y no el motor de base de datos.
- **No hay autenticación ni roles**: cualquiera con acceso a la URL puede evaluar y
  consultar el historial.
- **Un solo decisor** responde los 18 factores, incluidos los que no domina.
- El **catálogo es fijo** y no está versionado.
