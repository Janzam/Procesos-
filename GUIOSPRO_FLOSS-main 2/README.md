# GUIOSAD v2

Sistema de apoyo a la decisión para la adopción de software libre y de código
abierto (FLOSS) en organizaciones.

Un responsable de TI registra el software que quiere evaluar, responde un
cuestionario estructurado y el sistema devuelve una clasificación FODA factor a
factor, una recomendación de adopción y —esto es lo propio de esta versión— una
explicación de **de qué depende** esa recomendación.

---

## Qué es y de dónde viene

El sistema implementa la metodología **GUIOS**, definida en la tesis doctoral de
Víctor Hugo Rea Sánchez (Universidad de Sevilla, 2022). Esa metodología organiza
la evaluación en **3 dimensiones, 18 factores y 61 subfactores**, y la resuelve en
seis pasos que terminan en una recomendación **A** (adoptar), **B** (adoptar con
reservas) o **C** (posponer la adopción).

GUIOSAD v2 sustituye a un prototipo anterior, *GUIOS PRO*: una aplicación de
escritorio en `flexx` que generaba una página HTML y no guardaba nada. Esta
versión reconstruye la herramienta como sistema web, corrige los defectos que
impedían que el prototipo completara el cálculo y añade un análisis del resultado
que el prototipo no tenía.

**La fórmula no se toca.** El sistema ejecuta los seis pasos tal como los define la
tesis: la misma matriz de importancia relativa, el mismo umbral, la misma regla de
recomendación. Lo que añade es que el resultado se pueda **explicar**: qué factores lo
causan, de qué información depende cada uno y qué haría falta para que fuera otro.

> La justificación completa de ese planteamiento está en **[PROPUESTA.md](PROPUESTA.md)**.
> El historial de cambios, en **[CHANGELOG.md](CHANGELOG.md)**.

Proyecto de la asignatura *Procesos y Calidad de Software*, Universidad Estatal de
Milagro (UNEMI), Ecuador.

---

## Descargar y ejecutar

### Requisitos

Solo **Docker Desktop** (o Docker Engine con el plugin Compose). No hace falta
instalar Python, Node ni PostgreSQL: los tres servicios se levantan en
contenedores.

### Puesta en marcha

```bash
git clone https://github.com/Janzam/Procesos-.git
cd "Procesos-/GUIOSPRO_FLOSS-main 2"
docker compose up --build
```

La primera vez tarda unos minutos en construir las imágenes. Cuando termine:

| Servicio  | Dirección                      | Qué es                                |
|-----------|--------------------------------|---------------------------------------|
| Interfaz  | http://localhost:3000          | La aplicación                         |
| API       | http://localhost:8000/api/     | Interfaz REST                         |
| Base de datos | `localhost:5432`           | PostgreSQL 16 (`guiosad`/`guiosad`)   |

El arranque está encadenado: el backend no empieza hasta que PostgreSQL responde,
y la interfaz no se publica hasta que la API sirve el catálogo. Cuando
`docker compose up` termina, el sistema está listo de verdad.

### Órdenes habituales

```bash
docker compose up -d          # levantar en segundo plano
docker compose logs -f backend # ver los registros del servidor
docker compose down           # detener (la base de datos se conserva)
docker compose down -v        # detener y borrar también la base de datos
```

### Configuración

Funciona sin configurar nada: `docker-compose.yml` trae valores por defecto para
todas las variables. Para cambiarlos —otra contraseña, otra `SECRET_KEY`— copia
`.env.example` a `.env` y edítalo. El fichero `.env` no se versiona.

### Activar el asistente con IA (opcional)

El asistente propone valoraciones, redacta el informe ejecutivo y convierte el plan
de mejora en una secuencia de acciones. **Es opcional**: sin él, el sistema funciona
igual y la interfaz sencillamente no lo ofrece.

```bash
cp .env.example .env
# añade tu clave en la línea ANTHROPIC_API_KEY=
docker compose up -d
```

La clave se obtiene en [console.anthropic.com](https://console.anthropic.com/). El
asistente nunca interviene en el cálculo: el diagnóstico del resultado, el análisis de
sensibilidad y el conjunto mínimo de cambios se resuelven en el servidor sin él.

---

## Cómo se usa

La evaluación es un asistente de cuatro pasos:

1. **Software** — nombre, versión, licencia, proveedor, organización y evaluador.
   Todos opcionales; sirven para identificar qué se analizó.
2. **Factores** — se ajusta la importancia que cada uno de los 18 factores tiene
   para la organización. El sistema calcula la importancia relativa al instante y
   descarta los irrelevantes para no preguntar por ellos.
3. **Subfactores** — se valora el cumplimiento de cada subfactor de los factores
   que sí aplican, en cuatro niveles. El asistente avanza solo al siguiente factor
   pendiente y salta a los resultados al completar el último.
4. **Resultados** — tabla FODA por factor, diagrama de cuatro cuadrantes, radar
   por dimensión y la recomendación con su justificación. Se exporta a PDF y a
   hoja de cálculo.

Al responder el último criterio pendiente, el asistente pasa solo a Resultados: no
hace falta pulsar nada.

Con el asistente activado, cada factor ofrece **«Sugerir con IA»**, que propone una
valoración para cada uno de sus criterios con su justificación y su nivel de
confianza. Ninguna se guarda hasta que se acepta, y la que se acepta queda marcada
como procedente de una sugerencia.

### El panel de análisis

En la pantalla de resultados hay un botón **«Analizar el resultado»**. Abre un informe
que explica el veredicto en lugar de limitarse a entregarlo:

- **Factores que causan este resultado** — cuáles están provocando la recomendación y,
  para cada uno, si refleja un incumplimiento comprobado, si descansa en respuestas
  «Desconozco si cumple» o si el factor se decide con una sola pregunta.
- **Respuestas que deciden** — localiza las respuestas que, contestadas de otro
  modo, cambiarían por sí solas la recomendación final.
- **Qué falta para mejorar** — calcula el conjunto mínimo de cambios que llevaría a
  una recomendación mejor: qué factores lo impiden y cuántos subfactores tendrían
  que subir. Con el asistente activado, lo redacta además como plan de acción.
- **Informe ejecutivo** — solo con el asistente activado: redacta el resultado en
  prosa para presentarlo a la dirección.

Nada de esto modifica el cálculo: todo se deriva del resultado que ya obtuvo la
metodología. Es posible porque la base de datos almacena lo que respondió el decisor y
nunca el veredicto. Cuando la evaluación permite adoptar, el informe no desaparece:
señala los puntos que conviene vigilar aunque no bloqueen la decisión.

El historial ofrece el mismo panel para cualquier evaluación anterior.

---

## Estructura del proyecto

```
backend/                     Django 4.2 + Django REST Framework
  factores/                  Catálogo: dimensiones, factores y subfactores
  evaluaciones/              Persistencia de evaluaciones y sus respuestas
  recomendaciones/
    services.py              Motor de cálculo: los seis pasos de la metodología
    ia.py                    Asistencia con IA, fuera del motor y opcional
    catalogo_local.py        Catálogo en memoria para pruebas y experimentos
    pruebas_motor.py         Pruebas del motor (no necesitan base de datos)
    experimento_instrumento.py Comportamiento del instrumento, medido
  fixtures/                  Datos maestros del catálogo (18 factores, 61 subfactores)
frontend/                    React 18 + Vite, servido por nginx
  src/components/            Componentes y pasos del asistente
  src/pages/                 Evaluación, Historial y Panel de métricas
  src/api/guiosad.js         Único punto de acceso a la API
docker-compose.yml           Los tres servicios
```

Toda la lógica de la metodología vive en `backend/recomendaciones/services.py`.
El frontend no reimplementa ninguna fórmula: consulta al servidor incluso la
matriz de importancia relativa, para que las dos no puedan divergir.

---

## API

| Método | Ruta | Qué hace |
|---|---|---|
| `GET`  | `/api/factores/` | Catálogo completo con sus subfactores |
| `GET`  | `/api/recomendaciones/matriz-ir/` | Matriz 4×4 de importancia relativa |
| `GET`  | `/api/evaluaciones/` | Historial |
| `POST` | `/api/evaluaciones/` | Guarda una evaluación y devuelve su resultado |
| `GET`  | `/api/evaluaciones/{id}/` | Detalle de la evaluación y su resultado |
| `GET`  | `/api/evaluaciones/{id}/diagnostico/` | Qué factores causan el resultado y de qué dependen |
| `GET`  | `/api/evaluaciones/{id}/determinantes/` | Respuestas que deciden el resultado |
| `GET`  | `/api/evaluaciones/{id}/plan/` | Conjunto mínimo de cambios para mejorar |
| `POST` | `/api/evaluaciones/{id}/plan/` | Lo mismo, más su redacción por el asistente |
| `POST` | `/api/evaluaciones/{id}/informe/` | Informe ejecutivo redactado |
| `GET`  | `/api/evaluaciones/dashboard/` | Métricas agregadas |
| `GET`  | `/api/recomendaciones/ia/estado/` | Si el asistente está configurado |
| `POST` | `/api/recomendaciones/ia/sugerencias/` | Valoraciones propuestas para un factor |

---

## Desarrollo sin Docker

Útil si se quiere recarga en caliente del frontend.

```bash
# Servidor
cd backend
python -m venv .venv && . .venv/Scripts/activate   # en Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata fixtures/factores.json fixtures/subfactores.json
python manage.py runserver

# Interfaz, en otra terminal
cd frontend
npm install
npm run dev
```

Requiere un PostgreSQL accesible; lo más cómodo es levantar solo ese servicio con
`docker compose up -d db`.

## Pruebas

```bash
python backend/recomendaciones/pruebas_motor.py
```

Comprueban el motor contra el catálogo real —cargado desde las mismas fixtures con
las que se siembra la base de datos— sin necesidad de Docker ni de PostgreSQL.
Verifican que la fórmula sigue siendo la de la tesis —la matriz de importancia
relativa, el umbral, los textos de recomendación—, que **no existe ninguna variante**
de ella en el motor, que el diagnóstico, la sensibilidad y el plan dan los resultados
esperados, y que el módulo de IA no participa en el cálculo.

## Experimento sobre el instrumento

```bash
python backend/recomendaciones/experimento_instrumento.py
```

Genera 270 evaluaciones sobre el catálogo real, las resuelve con la metodología tal
como está y mide a qué responde su veredicto: a la calidad del software o a cuánto sabe
de él el evaluador. Es reproducible y no consume la API. Sus resultados están
comentados en el apartado 5 de [PROPUESTA.md](PROPUESTA.md).

---

## Licencia

Software libre, en coherencia con el objeto de estudio del proyecto.
