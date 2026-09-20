# GUIOSAD v2

**Guía para la Adopción de Software Open Source (GUIOSAD)** — migración de la app
monolítica (Python + flexx) a arquitectura desacoplada **Django REST + React**.

---

## Estructura del proyecto

```
GUIOSPRO_FLOSS-main 2/
├── backend/                     # API Django REST
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── guiosad/                 # Proyecto Django (settings, urls, wsgi)
│   ├── factores/                # App: dimensiones, factores y subfactores (datos maestros)
│   ├── evaluaciones/            # App: persistencia de evaluaciones del decisor
│   ├── recomendaciones/         # App: lógica de cálculo (IR, ponderación, FODA, recomendación)
│   ├── usuarios/                # App stub — pendiente sprint posterior
│   ├── reportes/                # App stub — pendiente sprint posterior
│   └── fixtures/
│       ├── factores.json        # 3 dimensiones y 18 factores
│       └── subfactores.json     # 61 subfactores
├── frontend/                    # App React + Vite
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/guiosad.js       # Llamadas al backend REST
│       ├── components/wizard/   # Wizard de 3 pasos (StepFactores, StepSubfactores, StepResultados)
│       ├── components/          # FodaFlower, RadarDimensiones
│       └── pages/               # EvaluacionPage, HistorialPage
├── docker-compose.yml           # Postgres + backend + frontend
├── CHANGELOG.md                 # Qué cambió vs el sistema original
├── MIGRACION_GUIOSAD.md        # Tabla de trazabilidad técnica (archivo por archivo)
└── README.md                    # Este archivo
```

---

## Ejecución con Docker (recomendada)

**Requisito único: tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.**

```bash
git clone https://github.com/Janzam/Procesos-.git
cd "Procesos-/GUIOSPRO_FLOSS-main 2"
docker compose up --build
```

Al arrancar, el backend ejecuta automáticamente:
1. `makemigrations` — genera las migraciones
2. `migrate` — crea las tablas en Postgres
3. `loaddata fixtures/factores.json` — carga las 3 dimensiones y 18 factores
4. `loaddata fixtures/subfactores.json` — carga los 61 subfactores

Luego abrir: **http://localhost:3000**

> El frontend corre en el puerto **3000** (el puerto 80 requiere permisos de administrador en Windows).

---

## Ejecución en desarrollo (sin Docker)

### Backend

```bash
cd "GUIOSPRO_FLOSS-main 2/backend"
pip install -r requirements.txt
python manage.py makemigrations factores evaluaciones usuarios
python manage.py migrate
python manage.py loaddata fixtures/factores.json
python manage.py loaddata fixtures/subfactores.json
python manage.py runserver
```

API disponible en: **http://localhost:8000/api/**

### Frontend

```bash
cd "GUIOSPRO_FLOSS-main 2/frontend"
npm install
npm run dev
```

App disponible en: **http://localhost:5173**

---

## Endpoints principales

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/api/factores/` | Lista de factores con subfactores e importancias sugeridas |
| `POST` | `/api/evaluaciones/` | Crea evaluación y retorna FODA + recomendación |
| `GET` | `/api/evaluaciones/` | Historial de evaluaciones |
| `GET` | `/api/evaluaciones/{id}/` | Detalle de una evaluación con su resultado |
| `POST` | `/api/recomendaciones/calcular-ir/` | Calcula importancia relativa en tiempo real |

---

## Solución de problemas

| Problema | Solución |
|---|---|
| Puerto 3000 ocupado | Cambiar `"3000:80"` por otro puerto en `docker-compose.yml` (servicio `frontend`) |
| Puerto 8000 ocupado | Cambiar el puerto del servicio `backend` en `docker-compose.yml` |
| Error de conexión a DB | Verificar que el contenedor `db` esté `healthy` antes del backend |
| CORS bloqueado en dev | El proxy de Vite en `vite.config.js` redirige `/api` → `localhost:8000` automáticamente |
| `makemigrations` falla | Verificar que las apps estén en `INSTALLED_APPS` en `guiosad/settings.py` |

---

## Historial de cambios

Ver [`CHANGELOG.md`](./CHANGELOG.md) para el detalle completo de qué se migró,
qué se preservó y qué cambió respecto al sistema original (Python + flexx).
