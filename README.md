# GUIOSAD v2

**Guía para la Adopción de Software Open Source (GUIOSAD)**: sistema de apoyo a la
decisión para adoptar software libre, reconstruido como API Django REST + interfaz
React a partir de la aplicación monolítica original (Python + flexx).

El proyecto completo está en la carpeta [`GUIOSPRO_FLOSS-main 2/`](GUIOSPRO_FLOSS-main%202/):

- [README](GUIOSPRO_FLOSS-main%202/README.md): qué es, cómo ejecutarlo, cómo se usa, API y pruebas.
- [PROPUESTA.md](GUIOSPRO_FLOSS-main%202/PROPUESTA.md): justificación del planteamiento.
- [CHANGELOG.md](GUIOSPRO_FLOSS-main%202/CHANGELOG.md): historial de cambios desde el sistema original.

## Puesta en marcha

Requiere solo [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/Janzam/Procesos-.git
cd "Procesos-/GUIOSPRO_FLOSS-main 2"
docker compose up --build
```

Cuando termine, la aplicación queda en **http://localhost:3000** y la API en
**http://localhost:8000/api/**. El resto de opciones (desarrollo sin Docker,
asistente con IA, pruebas) están en el README del proyecto.
