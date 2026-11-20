# GUIOSAD v2

Guía para la Adopción de Software Open Source (GUIOSAD): sistema de apoyo a la decisión para adoptar software libre, reconstruido como API Django REST + interfaz React a partir de la aplicación monolítica original (Python + flexx).

El proyecto completo está en la carpeta GUIOSPRO_FLOSS-main 2/:

    README: qué es, cómo ejecutarlo, cómo se usa, API y pruebas.
    PROPUESTA.md: justificación del planteamiento.
    CHANGELOG.md: historial de cambios desde el sistema original.

## Puesta en marcha
----------

Requiere solo Docker Desktop.

```
git clone https://github.com/Janzam/Procesos-.git
cd "Procesos-/GUIOSPRO_FLOSS-main 2"
docker compose up --build
```

Cuando termine, la interfaz queda en http://localhost:3001 y la API en
http://localhost:8001/api/. La guía de ejecución y el dump se entregan aparte.
