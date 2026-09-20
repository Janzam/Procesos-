# GUIOSAD v. 0.1.2 — Requisitos y Pasos de Ejecución

Guía completa para ejecutar el proyecto GUIOSAD (Guía para la adopción de soluciones de software libre).

---

## Requisitos previos

| Herramienta | Versión mínima | Descripción |
|---|---|---|
| Python | 3.8 o superior | Intérprete principal del proyecto |
| pip | incluido con Python | Gestor de paquetes |
| pandas | 3.0.0 o superior | Procesamiento de datos CSV |
| Navegador web | cualquier moderno | Chrome, Firefox, Edge, etc. |

> **Nota:** La librería `flexx` solo es necesaria si se desea **regenerar** el archivo `guiosad.html`
> desde `main.py`. Para simplemente **ejecutar** la aplicación, NO es necesario instalar `flexx`.

---

## Opción A — Ejecución rápida (recomendada)

Usa el archivo `guiosad.html` ya exportado. No requiere instalar `flexx`.

### Paso 1 — Verificar que Python esté instalado

Abre una terminal (PowerShell o CMD) y ejecuta:

```powershell
python --version
```

Deberías ver algo como:

```
Python 3.12.10
```

Si Python no está instalado, descárgalo desde: https://www.python.org/downloads/

---

### Paso 2 — Instalar dependencias Python

Instala la librería `pandas` si no la tienes:

```powershell
pip install pandas
```

Verifica la instalación:

```powershell
pip show pandas
```

---

### Paso 3 — Navegar a la carpeta del proyecto

En la terminal, ve a la carpeta donde está el proyecto. Por ejemplo:

```powershell
cd "c:\Users\zambr\Downloads\GUIOSPRO_FLOSS-main 2-20260920T013138Z-1-001\GUIOSPRO_FLOSS-main 2"
```

Verifica que los archivos estén presentes:

```powershell
dir
```

Deberías ver, entre otros:
- `guiosad.html`
- `guiosad.py`
- `guiosad_data.csv`
- `factors.csv`
- `main.py`

---

### Paso 4 — Levantar el servidor HTTP local

Para evitar restricciones de seguridad del navegador al abrir archivos locales,
inicia un servidor HTTP simple con Python:

```powershell
python -m http.server 8080
```

Verás en la terminal:

```
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
```

> **Importante:** Deja esta terminal abierta mientras uses la aplicación.
> Para detenerla, presiona `Ctrl + C`.

---

### Paso 5 — Abrir la aplicación en el navegador

Abre tu navegador preferido y visita:

```
http://localhost:8080/guiosad.html
```

La aplicación cargará con 3 pestañas:

| Pestaña | Descripción |
|---|---|
| Paso 1 y 2 | Obtención de factores relevantes (sliders de evaluación por factor) |
| Paso 3 y 4 | Obtención de factores ponderados (evaluación de subfactores) |
| Paso 5 y 6 | Evaluación FODA y recomendación sobre la adopción |

---

## Opción B — Regenerar el HTML desde el código fuente

Solo si deseas modificar `main.py` y volver a generar `guiosad.html`.

### Paso 1 — Instalar todas las dependencias

```powershell
pip install pandas flexx
```

> **Advertencia:** `flexx` puede tener problemas de compatibilidad con Python 3.12.
> Si falla, intenta con Python 3.9 o 3.10.

### Paso 2 — Ejecutar el script principal

```powershell
python main.py
```

Esto:
1. Abre la aplicación en el navegador automáticamente
2. Genera/sobreescribe el archivo `guiosad.html` en tu carpeta de usuario (`~/guiosad.html`)

---

## Estructura del proyecto

```
GUIOSPRO_FLOSS-main 2/
├── guiosad.html              # Aplicación web exportada (lista para usar)
├── guiosad.py                # Modelo de datos GUIOSAD (clases y lógica)
├── main.py                   # Interfaz gráfica con flexx (para regenerar HTML)
├── guiosad_data.csv          # Datos: dimensiones, factores y subfactores
├── factors.csv               # Importancia sugerida y alcance por factor
├── MATRIZ RECOMENDACION...   # Matriz de referencia en Excel
├── Manual tecnico GUIOSPRO.pdf  # Documentación técnica del sistema
└── README.md                 # Descripción general del proyecto
```

---

## Solución de problemas comunes

| Problema | Causa probable | Solución |
|---|---|---|
| `python` no se reconoce | Python no está en el PATH | Reinstalar Python con la opción "Add to PATH" activada |
| Puerto 8080 ocupado | Otro proceso usa ese puerto | Cambiar a otro puerto: `python -m http.server 9090` |
| La página no carga | El servidor no está corriendo | Verificar que la terminal con el servidor esté abierta |
| Página en blanco | Caché del navegador | Presionar `Ctrl + Shift + R` para forzar recarga |
| Error con `flexx` | Incompatibilidad de versión | Usar Python 3.9 o 3.10 con un entorno virtual |

---

## Referencia rápida (comandos en orden)

```powershell
# 1. Verificar Python
python --version

# 2. Instalar dependencias
pip install pandas

# 3. Ir a la carpeta del proyecto
cd "c:\Users\zambr\Downloads\GUIOSPRO_FLOSS-main 2-20260920T013138Z-1-001\GUIOSPRO_FLOSS-main 2"

# 4. Iniciar servidor
python -m http.server 8080

# 5. Abrir en el navegador → http://localhost:8080/guiosad.html
```
