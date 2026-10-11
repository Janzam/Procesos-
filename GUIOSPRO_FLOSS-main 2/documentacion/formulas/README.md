# Las fórmulas de GUIOS, explicadas

Documento de apoyo para la defensa de GUIOSAD v2 · Grupo 8 · UNEMI

Todo lo que sigue está contrastado con la tesis doctoral de Rea Sánchez (2022),
capítulo 5, secciones 5.2.2 y 5.2.3, y con el código del sistema. Cada cifra que
aparece aquí puede comprobarse con el script [`verificar.py`](verificar.py).

---

## 0. Qué resuelve este documento

En GUIOS hay **dos cálculos que se parecen mucho y que se confunden constantemente**:

1. Uno que se hace **una sola vez**, al construir el catálogo de la metodología, y que
   produce la **importancia sugerida (IS)** de cada factor.
2. Otro que se hace **en cada evaluación**, y que produce la **importancia relativa (IR)**
   de cada factor para esa organización concreta.

Los dos usan **la misma función**: la Figura 5.10 de la tesis. Por eso se confunden. Y
por eso, cuando alguien pregunta «¿de dónde sale ese número?», hay que saber de cuál de
los dos está hablando.

Este documento explica los dos, de dónde sale cada entrada, y por qué la función asigna
los valores que asigna.

---

## 1. El recorrido completo

```
   SE HACE UNA VEZ, AL CONSTRUIR EL CATÁLOGO
   ───────────────────────────────────────────────────────────────

   encuesta a expertos ─────────────────────▶  IE   (1-4)
                                                 │
   citas en IEEE, ACM, Scopus, WOS                │
        │                                         │
        ├─ fórmula 5.1 ─▶ r = citas / subfactores │
        └─ fórmula 5.2 ─▶ cuartil ───────────▶  IL   (1-4)
                                                 │
                              Figura 5.10  ◀─────┤
                                   │
                                   ▼
                                  IS   (1-4)   ← queda grabada en el catálogo


   SE HACE EN CADA EVALUACIÓN
   ───────────────────────────────────────────────────────────────

   IS (del catálogo) ─┐
                      ├── Figura 5.10 ──▶ IR (1-4)   ← paso 2
   ID (lo elige el   ─┘                     │
       decisor)                             ▼
                                   ¿IR > 1? ── no ──▶ el factor se descarta  ← paso 3
                                        │ sí
                                        ▼
                      promedio de sus subfactores ──▶ PM   ← paso 4
                                        │
                        PM ≥ 3,0 y alcance ──▶ FODA        ← paso 5
                                        │
                                        ▼
                               recomendación A, B o C      ← paso 6
```

La entrada que **nuestra propuesta automatiza es IL**, y solo esa. Todo lo demás se
mantiene exactamente como lo define la tesis.

---

## 2. Primera parte: cómo se construye el catálogo

### 2.1 Los cinco indicadores

La Tabla 5.2 de la tesis define cinco indicadores, todos en la misma escala de cuatro
niveles: **1 irrelevante · 2 opcional · 3 importante · 4 fundamental**.

| Indicador | De dónde sale | Para qué sirve |
|---|---|---|
| **IE** · Importancia del experto | De la encuesta a expertos en FLOSS | Entra en IS |
| **IL** · Importancia de la literatura | De la cantidad de citas y subfactores | Entra en IS |
| **IS** · Importancia sugerida | De cruzar IE con IL | Entra en IR |
| **ID** · Importancia del decisor | La elige el responsable de TI | Entra en IR |
| **IR** · Importancia relativa | De cruzar IS con ID | Selecciona los factores relevantes (IR > 1) |

Conviene fijarse en la cadena: **IE e IL dan IS; IS e ID dan IR**. Dos cruces, la misma
función.

### 2.2 IE — la importancia del experto

Sale de la encuesta de la sección 5.2.2. En la Tabla 5.3 **vale 3 para los dieciocho
factores**, sin excepción. Esto tiene una consecuencia muy concreta que veremos en el
apartado 5.4 y que conviene tener preparada, porque es la pregunta más probable del
tribunal.

### 2.3 IL — la importancia de la literatura

Este es el indicador que el autor calculó **a mano**, y el que nosotros automatizamos.

#### Fórmula 5.1 — citas por subfactor

> Por cada factor *i* se obtiene la cantidad de citas (*cᵢ*) recibidas por sus
> respectivos subfactores (*n*). Las citas son obtenidas de bases de datos importantes
> como IEEE, ACM, Scopus y Web of Science.

$$r_i = \frac{c_i}{n}$$

**Por qué se divide.** Si se usara el total de citas a secas, un factor saldría
favorecido solo por tener muchos subfactores: cuantas más preguntas cuelgan de él, más
artículos se le pueden atribuir. Dividir entre el número de subfactores mide *densidad*
de literatura, no volumen.

El ejemplo que mejor lo enseña está en los propios datos:

| Factor | Citas | Subfactores | r | IL |
|---|---:|---:|---:|---:|
| Documentación | 20 | 11 | 20/11 = **1,82** | **1** |
| Apoyo de la alta dirección | 5 | 1 | 5/1 = **5,00** | **4** |

Documentación tiene **cuatro veces más citas** que Apoyo de la alta dirección, y sin
embargo queda en el cuartil más bajo. Porque esas 20 citas están repartidas entre once
subfactores, mientras que las 5 de Apoyo se concentran en uno solo.

#### Los cuartiles

Un cuartil parte un conjunto ordenado en cuatro grupos con el mismo número de elementos.
Los tres valores que marcan los cortes son Q1, Q2 (la mediana) y Q3.

**Paso a paso con los 18 factores.** Primero se ordenan los valores de *r* de menor a
mayor:

| Pos. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| r | 1,00 | 1,00 | 1,00 | 1,50 | 1,818 | 2,00 | 2,50 | 3,00 | 3,50 |

| Pos. | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
|---|---|---|---|---|---|---|---|---|---|
| r | 3,80 | 4,00 | 4,00 | 4,125 | 5,00 | 5,00 | 6,75 | 7,167 | 12,00 |

Con el método estándar (el `CUARTIL.INC` de Excel), la posición de un cuartil es:

$$\text{posición} = (n-1)\cdot p + 1 \qquad \text{con } n = 18$$

| Cuartil | p | Posición | Cae entre | Interpolación | Resultado |
|---|---|---|---|---|---|
| Q1 | 0,25 | 17·0,25 + 1 = **5,25** | 5.º (1,818) y 6.º (2,00) | 1,818 + 0,25·(2,00 − 1,818) | **r_q1 = 1,86** |
| Q2 | 0,50 | 17·0,50 + 1 = **9,5** | 9.º (3,50) y 10.º (3,80) | 3,50 + 0,50·(3,80 − 3,50) | **r_q2 = 3,65** |
| Q3 | 0,75 | 17·0,75 + 1 = **13,75** | 13.º (4,125) y 14.º (5,00) | 4,125 + 0,75·(5,00 − 4,125) | **r_q3 = 4,78** |
| Q4 | 1,00 | el máximo | — | — | **r_q4 = 12,00** |

La parte decimal de la posición dice cuánto hay que avanzar entre los dos valores
vecinos. Posición 5,25 significa «el 5.º más una cuarta parte de la distancia al 6.º».

**Un detalle que conviene tener preparado.** La tesis dice literalmente que «los valores
*rₓ* corresponden a los valores máximos dentro de cada cuartil». Con esa lectura los
cortes no serían 1,86 / 3,65 / 4,78 sino **1,818 / 3,50 / 4,125** —el mayor valor de cada
grupo—. Pues bien: **la asignación de IL sale idéntica con los dos métodos**, porque no
hay ningún factor cuyo *r* caiga entre 1,818 y 1,86, ni entre 3,50 y 3,65, ni entre 4,125
y 4,78. El resultado no depende de qué convenio de cuartil se use. Es un buen argumento
si alguien discute el método.

#### Fórmula 5.2 — asignación del nivel

$$
IL(r_i) = \begin{cases}
1 & \text{si } r_i \le r_{q1} \\
2 & \text{si } r_{q1} < r_i \le r_{q2} \\
3 & \text{si } r_{q2} < r_i \le r_{q3} \\
4 & \text{si } r_{q3} < r_i \le r_{q4}
\end{cases}
$$

| IL | Rango de r | Factores | Cuántos |
|---|---|---|---:|
| **1** | r ≤ 1,86 | Casos de estudio de adopción FLOSS, Centralidad de la TI, Tiempo de adopción, Actitud hacia el cambio, Documentación | 5 |
| **2** | 1,86 < r ≤ 3,65 | Portabilidad, Reusabilidad, Bloqueo de proveedores, Usabilidad | 4 |
| **3** | 3,65 < r ≤ 4,78 | Fiabilidad, Mantenibilidad, Prueba, Compatibilidad | 4 |
| **4** | 4,78 < r ≤ 12 | Personalización, Apoyo de la alta dirección, Formación, Soporte, TCO | 5 |

Los grupos no salen de 4,5 factores cada uno (18 ÷ 4) sino de 5-4-4-5, porque hay valores
repetidos que caen justo en los cortes. Es normal y no invalida nada.

#### La tabla completa

| # | Dimensión | Factor | TC | NS | r = TC/NS | IL | IS |
|---:|---|---|---:|---:|---:|---:|---|
| 1 | Organizacional | Casos de estudio de adopción FLOSS | 1 | 1 | 1,00 | 1 | Opcional (2) |
| 2 | Organizacional | Centralidad de la TI | 2 | 2 | 1,00 | 1 | Opcional (2) |
| 3 | Organizacional | Tiempo de adopción | 2 | 2 | 1,00 | 1 | Opcional (2) |
| 4 | Organizacional | Actitud hacia el cambio | 3 | 2 | 1,50 | 1 | Opcional (2) |
| 5 | Tecnológica | Documentación | 20 | 11 | 1,818 | 1 | Opcional (2) |
| 6 | Tecnológica | Portabilidad | 4 | 2 | 2,00 | 2 | Opcional (2) |
| 7 | Tecnológica | Reusabilidad | 5 | 2 | 2,50 | 2 | Opcional (2) |
| 8 | Organizacional | Bloqueo de proveedores | 3 | 1 | 3,00 | 2 | Opcional (2) |
| 9 | Tecnológica | Usabilidad | 14 | 4 | 3,50 | 2 | Opcional (2) |
| 10 | Tecnológica | Fiabilidad | 19 | 5 | 3,80 | 3 | Importante (3) |
| 11 | Tecnológica | Mantenibilidad | 4 | 1 | 4,00 | 3 | Importante (3) |
| 12 | Tecnológica | Prueba | 4 | 1 | 4,00 | 3 | Importante (3) |
| 13 | Tecnológica | Compatibilidad | 33 | 8 | 4,125 | 3 | Importante (3) |
| 14 | Tecnológica | Personalización | 30 | 6 | 5,00 | 4 | Importante (3) |
| 15 | Organizacional | Apoyo de la alta dirección | 5 | 1 | 5,00 | 4 | Importante (3) |
| 16 | Organizacional | Formación | 27 | 4 | 6,75 | 4 | Importante (3) |
| 17 | Organizacional | Soporte | 43 | 6 | 7,167 | 4 | Importante (3) |
| 18 | Económica | TCO | 24 | 2 | 12,00 | 4 | Importante (3) |

**Comprobación que vale la pena mencionar:** la columna NS suma exactamente **61**, que es
el número de subfactores del catálogo. Los datos de la Tabla 5.3 y el catálogo que usa el
sistema describen el mismo conjunto.

### 2.4 IS — cruzar IE con IL

La importancia sugerida **no sale de las fórmulas 5.1 ni 5.2**. Esas dos solo producen IL.
IS se obtiene **cruzando IE con IL en la Figura 5.10**, que es la función del apartado
siguiente.

Como IE vale 3 en los dieciocho factores, en la práctica:

| IL | IE | IS resultante |
|---:|---:|---|
| 1 | 3 | Opcional (2) |
| 2 | 3 | Opcional (2) |
| 3 | 3 | Importante (3) |
| 4 | 3 | Importante (3) |

---

## 3. La Figura 5.10: por qué se asignan así los números

Esta es la pregunta que hay que saber responder sin dudar.

### 3.1 La matriz

La tesis la presenta como una tabla de doble entrada. Las etiquetas de los ejes son
dobles a propósito, porque la función se usa dos veces:

> **Eje vertical:** Importancia de la literatura (IL) *[Importancia sugerida (IS)]*
> **Eje horizontal:** Importancia del experto (IE) *[Importancia del decisor (ID)]*
> **Salida:** Importancia sugerida (IS) *[Importancia relativa (IR)]*

|  | **1** | **2** | **3** | **4** |
|---|---|---|---|---|
| **1** | Irrelevante (1) | Irrelevante (1) | Opcional (2) | Opcional (2) |
| **2** | Irrelevante (1) | Opcional (2) | Opcional (2) | Importante (3) |
| **3** | Opcional (2) | Opcional (2) | Importante (3) | Importante (3) |
| **4** | Opcional (2) | Importante (3) | Importante (3) | Fundamental (4) |

### 3.2 La fórmula que genera la matriz

Las dieciséis celdas se reproducen, una por una, con esta expresión:

$$\text{salida} = \left\lfloor \frac{(a-1) + (b-1)}{2} \right\rfloor + 1$$

donde *a* y *b* son las dos entradas, ambas en 1-4.

### 3.3 Qué hace la fórmula, paso a paso

Tomemos la celda (3, 3), que es la más frecuente en este catálogo:

| Paso | Operación | Por qué |
|---|---|---|
| 1 | 3 − 1 = 2 y 3 − 1 = 2 | Se pasa de la escala 1-4 a un **índice 0-3**: «cuántos escalones por encima del mínimo». Sin esto, dos «irrelevantes» (1 y 1) sumarían 2 y no 0. |
| 2 | 2 + 2 = 4 | Se suman las dos evidencias. El rango queda en 0-6. |
| 3 | 4 ÷ 2 = 2 | Se promedian: la salida vuelve al rango 0-3 de una sola escala. |
| 4 | ⌊2⌋ = 2 | Se descartan los decimales. **Hacia abajo, nunca redondeando.** |
| 5 | 2 + 1 = 3 | Se vuelve a la escala 1-4 → **Importante (3)**. |

### 3.4 Por qué división entera y no redondeo

Aquí está el fondo del asunto, y es lo que conviene decir en la exposición.

**La fórmula es el promedio de las dos entradas, redondeado siempre hacia abajo.** Eso la
hace deliberadamente **conservadora**: cuando las dos fuentes no están de acuerdo, el
factor baja de nivel, no sube.

Tres consecuencias que se ven en la matriz:

- **Para que algo sea «fundamental» las dos entradas tienen que decir 4.** Es la única
  celda de las dieciséis que produce un 4. Subir un factor al máximo exige acuerdo
  completo.
- **El desacuerdo se resuelve a la baja.** La celda (4, 1) —una fuente dice «fundamental»
  y la otra «irrelevante»— da ⌊(3+0)/2⌋ = 1, es decir **Opcional**, no «importante». Con
  redondeo al más cercano habría dado 2 → Importante, y un solo juicio extremo arrastraría
  el resultado.
- **Descartar un factor también cuesta.** Solo tres celdas dan «irrelevante»: (1,1), (1,2)
  y (2,1). Hace falta que ambas fuentes estén en lo más bajo. La metodología prefiere
  preguntar de más a dejar fuera algo que importaba.

Dicho en una frase para la defensa: **la función premia el acuerdo y castiga el
desacuerdo, y lo hace de forma asimétrica —es fácil quedarse en el medio y difícil llegar
a los extremos—.** Eso es exactamente lo que se espera de un instrumento que decide si una
organización adopta o no un software.

### 3.5 La misma función, dos usos

| Uso | Entrada a | Entrada b | Salida | Cuándo |
|---|---|---|---|---|
| Construir el catálogo | IL (literatura) | IE (expertos) | **IS** | Una vez, antes de desplegar |
| Evaluar (paso 2) | IS (catálogo) | ID (decisor) | **IR** | En cada evaluación |

Que sea la misma función no es casualidad: en los dos casos se está combinando **una
valoración de referencia con una valoración particular**, y en los dos casos interesa la
misma prudencia.

---

## 4. Segunda parte: la evaluación

### 4.1 Paso 2 — Importancia relativa

$$IR = \left\lfloor \frac{(IS-1) + (ID-1)}{2} \right\rfloor + 1$$

Es la Figura 5.10 otra vez, con IS e ID.

### 4.2 Paso 3 — Filtrado

Se descartan los factores con **IR = 1** (irrelevante). Solo se preguntan los subfactores
de los que tienen IR > 1.

### 4.3 Paso 4 — Ponderación media

$$PM = \frac{1}{m}\sum_{j=1}^{m} v_j$$

Promedio aritmético **sin pesos** de las valoraciones de los *m* subfactores del factor. La
escala de respuesta es: 1 no cumple · 2 desconozco si cumple · 3 cumple parcialmente ·
4 cumple el requisito.

> **Ojo con el 2.** «Desconozco si cumple» **no es una respuesta en blanco**: entra en el
> promedio con valor 2. En un factor de un solo subfactor produce exactamente el mismo
> resultado que responder «no cumple».

### 4.4 Paso 5 — Clasificación FODA

El **alcance** del factor decide la pareja de categorías y la **ponderación** decide el lado:

| | PM ≥ 3,0 | PM < 3,0 |
|---|---|---|
| **Alcance interno** | Fortaleza | Debilidad |
| **Alcance externo** | Oportunidad | Amenaza |

El umbral es 3,0 e **igualarlo ya basta** para quedar en el lado favorable.

### 4.5 Paso 6 — Recomendación

Regla **de existencia**:

- **C** — si hay al menos una debilidad o amenaza en un factor cuya IR sea *importante* o *fundamental*.
- **B** — si las hay, pero solo en factores de IR *opcional*.
- **A** — si no hay ninguna.

> El paso 6 es el único de los seis que la tesis no formaliza con una expresión, y su
> descripción admite dos lecturas. El prototipo de partida implementa las dos, una
> detrás de otra, y la segunda sobrescribe el resultado de la primera. Nuestro sistema
> adopta el criterio de existencia, que es el que efectivamente se ejecuta en el código
> original, y deja constancia explícita de la ambigüedad.

### 4.6 Ejemplo completo

Dos factores reales, de principio a fin:

| | Compatibilidad | Mantenibilidad |
|---|---|---|
| IS (catálogo) | 3 · importante | 3 · importante |
| ID (el decisor) | 3 · importante | 3 · importante |
| **Paso 2** | ⌊((3−1)+(3−1))/2⌋ + 1 = ⌊4/2⌋ + 1 = **3** Importante | ⌊4/2⌋ + 1 = **3** Importante |
| **Paso 3** | entra | entra |
| Subfactores | 8 → (4, 4, 2, 4, 3, 4, 2, 4) | 1 → («desconozco» = 2) |
| **Paso 4** | 27 ÷ 8 = **3,38** | 2 ÷ 1 = **2,00** |
| Alcance | Externo | Externo |
| **Paso 5** | 3,38 ≥ 3,0 → **Oportunidad** | 2,00 < 3,0 → **Amenaza** |

**Paso 6:** basta Mantenibilidad —una amenaza en un factor importante— para que toda la
evaluación termine en **C**, por favorables que sean los diecisiete factores restantes. Y
esa amenaza descansa en **una sola respuesta**, y además en un «desconozco si cumple».

---

## 5. Lo que encontramos al verificar

### 5.1 Las dieciocho filas cuadran

Aplicando las fórmulas 5.1 y 5.2 a las columnas NS y TC de la Tabla 5.3 se obtienen
**exactamente los dieciocho valores de IL** que publica la tesis, y cruzándolos con IE = 3
en la Figura 5.10 se obtienen **exactamente los dieciocho valores de IS**. El cálculo del
documento es correcto.

### 5.2 Dos factores donde el prototipo no coincide con la tesis

Al comparar la Tabla 5.3 con el fichero de datos del prototipo de partida
(`proyecto base 0/factors.csv`) aparecen **dos discrepancias**, y están cruzadas:

| Factor | IL | IS según la Tabla 5.3 | IS en el prototipo |
|---|---:|---|---|
| Usabilidad | 2 | **Opcional (2)** | Importante (3) |
| Apoyo de la alta dirección | 4 | **Importante (3)** | Opcional (2) |

Los otros dieciséis coinciden. Nuestro sistema heredó el catálogo del prototipo, así que
**arrastra las dos discrepancias**. No altera el reparto global —siguen siendo nueve
factores con IS = 3 y nueve con IS = 2— pero sí cambia cuáles.

### 5.3 Una errata en la prosa de la tesis

El texto que acompaña a la Tabla 5.3 dice que «en la dimensión tecnológica, 6 de los 9
factores tienen una IS de 3». En la tabla son **5** (Compatibilidad, Fiabilidad,
Mantenibilidad, Personalización y Prueba). Serían 6 si Usabilidad valiera 3 —que es
justo lo que hace el prototipo—. Para la dimensión organizacional, en cambio, el texto
dice «3 de los 8», y eso **solo cuadra con la tabla**, no con el prototipo, que deja
Apoyo de la alta dirección en 2.

Es decir: el prototipo sigue la prosa en un sitio y la contradice en otro. La fuente
coherente consigo misma y con la Figura 5.10 es **la Tabla 5.3**.

> Esto hay que plantearlo como una pregunta al autor, no como una corrección. La decisión
> de alinear el catálogo con la Tabla 5.3 le corresponde a él.

### 5.4 Por qué IS solo puede valer 2 o 3

Porque **IE vale 3 en los dieciocho factores**. Mirando la fila 3 de la matriz —la que
corresponde a IE = 3— solo hay dos salidas posibles: Opcional (2) e Importante (3). Los
niveles 1 y 4 son inalcanzables mientras IE sea constante.

Y esto arrastra una consecuencia en cadena: si IS solo vale 2 o 3, entonces **de las
dieciséis celdas de la matriz del paso 2 solo se usan ocho**, las de esas dos filas. La
mitad del instrumento nunca entra en juego.

---

## 6. Nuestra propuesta: recalcular IL con literatura de 2020 a 2025

### 6.1 Qué se mantiene y qué cambia

| | |
|---|---|
| **Se mantiene** | La fórmula 5.1, la fórmula 5.2, el método de cuartiles, la Figura 5.10, y todo el proceso de evaluación (pasos 2 a 6). |
| **Cambia** | Los datos de entrada de la fórmula 5.1: el número de citas, tomado de 2020-2025 en lugar del rango original, y obtenido **por el sistema** en lugar de a mano. |

No tocamos ninguna fórmula. Cambiamos de dónde salen los números que entran en ellas.

### 6.2 El procedimiento

Para cada uno de los dieciocho factores:

1. **Se arma la consulta** a partir del nombre del factor **y de los subfactores que
   cuelgan de él** —Compatibilidad tiene ocho—. Un modelo de lenguaje los traduce al
   vocabulario de la literatura: sinónimos y términos en inglés del dominio FLOSS. Esta es
   la parte que exige criterio y la única en la que interviene la IA.
2. **Se cuenta** lanzando esa consulta contra bases bibliográficas abiertas (OpenAlex,
   Crossref), restringida a publicaciones de 2020 a 2025. Lo que vuelve es *cᵢ*, un número
   de artículos verificable, no una estimación del modelo.
3. **Se aplica la fórmula 5.1**: *rᵢ = cᵢ / n*, con el mismo *n* de siempre.
4. **Se aplica la fórmula 5.2**: se ordenan los dieciocho valores, se calculan los
   cuartiles y se asigna IL.
5. **Se cruza con IE en la Figura 5.10** para obtener la nueva IS.
6. **Se guarda la evidencia**: la consulta empleada, el recuento, la fuente y la fecha.
   Cualquiera puede repetir la búsqueda y comprobar el valor.

> **Por qué el recuento no lo da la IA.** Si se le pregunta a un modelo de lenguaje
> cuántos artículos existen sobre un tema, se inventa la cifra. La IA hace la parte
> semántica; el número lo da una base consultable con DOI.

### 6.3 Ejemplo de cómo funcionaría

Supongamos que la búsqueda 2020-2025 devuelve para Documentación 180 citas y para
Mantenibilidad 60:

| Factor | n | c (2020-2025) | r = c/n |
|---|---:|---:|---:|
| Documentación | 11 | 180 | 16,36 |
| Mantenibilidad | 1 | 60 | 60,00 |

Los valores absolutos cambian mucho —hay muchísima más literatura reciente— pero eso **no
importa**, porque la fórmula 5.2 no usa umbrales absolutos sino **cuartiles**: lo que
decide el nivel es la posición relativa de cada factor dentro del conjunto de los
dieciocho. El método es robusto frente al crecimiento general de la producción
científica. Es otro buen argumento para la defensa.

### 6.4 El límite honesto

**Recalcular IL cambia qué factores caen en cada nivel, pero no cuántos niveles se usan.**
Mientras IE siga valiendo 3 para todos, IS seguirá pudiendo valer solo 2 o 3, por lo
explicado en 5.4.

Para que la escala de cuatro niveles se usara entera habría que hacer **además** una de
estas tres cosas, y las tres son decisión del autor de la metodología, no nuestra:

1. **Repetir la encuesta a expertos** para que IE varíe por factor. Es lo más fiel al
   método, y lo más caro.
2. **Usar IL directamente como IS** cuando no hay encuesta nueva. Es coherente con la idea
   de automatizar, pero se salta la Figura 5.10 en el primer cruce.
3. **Dejarlo como está** y asumir que IS ∈ {2, 3}, documentándolo como una limitación
   conocida del instrumento.

Nuestra propuesta implementa la **opción 3** por defecto —no inventamos datos de expertos
que no tenemos— y deja preparado el cálculo para la 1 o la 2 si el autor lo decide.

---

## 7. Preguntas probables y cómo responderlas

**«¿Por qué la división entera y no un redondeo normal?»**
Porque hace la función conservadora: cuando las dos fuentes discrepan, el factor baja de
nivel en lugar de subir. Con redondeo al más cercano, un solo juicio extremo arrastraría
el resultado. Ver 3.4.

**«¿Qué pasa si cambio el método de cálculo del cuartil?»**
Nada. Lo comprobamos: con interpolación (`CUARTIL.INC`) los cortes son 1,86 / 3,65 / 4,78
y con el máximo de cada grupo son 1,818 / 3,50 / 4,125. **La asignación de IL es idéntica**
porque ningún factor cae en medio. Ver 2.3.

**«Con más literatura en 2020-2025, ¿no se disparan todos los valores?»**
Los valores absolutos sí, el resultado no. La fórmula 5.2 reparte por cuartiles, o sea por
posición relativa dentro del conjunto. Ver 6.3.

**«¿Por qué Documentación tiene tantas citas y sale con IL = 1?»**
Porque están repartidas entre once subfactores. r = 20/11 = 1,82. La fórmula mide densidad,
no volumen. Ver 2.3.

**«¿Vais a cambiar la fórmula de la tesis?»**
No. Cambiamos únicamente los datos de entrada de la fórmula 5.1 y cómo se obtienen. Las
fórmulas, la matriz, el umbral de 3,0 y la regla del paso 6 quedan intactos.

**«¿Entonces vuestra propuesta hace que se usen los cuatro niveles?»**
No por sí sola, y conviene decirlo así. Mientras IE valga 3 para todos los factores, IS
solo puede valer 2 o 3. Lo que cambia es **qué** factores están en cada grupo, con datos de
esta década en lugar de los de hace diez años. Usar la escala entera exigiría revisar
también IE, y eso es decisión del autor. Ver 6.4.

---

## 8. Cómo reproducir los cálculos

```bash
python verificar.py
```

El script reproduce las fórmulas 5.1 y 5.2 sobre los datos de la Tabla 5.3, calcula los
cuartiles por los dos métodos, obtiene IL e IS, y los compara con lo que publica la tesis
y con lo que trae el catálogo del sistema. No necesita dependencias.

---

## Fuentes

Rea Sánchez, V. H. (2022). *Factores para la adopción de soluciones basadas en software
libre y fuentes abiertas* [Tesis doctoral, Universidad de Sevilla]. Departamento de
Lenguajes y Sistemas Informáticos, ETSI Informática. — Capítulo 5, secciones 5.2.2 y
5.2.3; Tabla 5.2 (p. 86), Tabla 5.3 (p. 88), Figura 5.10 (p. 89), fórmulas 5.1 y 5.2
(p. 87).
