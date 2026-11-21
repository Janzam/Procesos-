# Publicar GUIOSAD en Vercel (gratis)

GUIOSAD se publica como **dos proyectos de Vercel** que salen del mismo repositorio de GitHub,
más una base de datos **Neon** (PostgreSQL gratuito que se crea desde Vercel):

| Proyecto | Carpeta (Root Directory) | Qué es | Dirección de ejemplo |
|---|---|---|---|
| `guiosad-api` | `GUIOSPRO_FLOSS-main 2/backend` | Django (la API) | `https://guiosad-api.vercel.app` |
| `guiosad` | `GUIOSPRO_FLOSS-main 2/frontend` | React (la interfaz) | `https://guiosad.vercel.app` |
| Neon | — | PostgreSQL en la nube | (la conecta Vercel) |

Todo cabe en los planes gratuitos: **Vercel Hobby** (uso personal o académico, sin tarjeta) y **Neon Free**.

## Qué necesitas

- Una cuenta de **GitHub** con acceso al repositorio `Janzam/Procesos-` (rama `master`).
- Una cuenta de **Vercel** (se crea con GitHub en el paso 1).
- **Docker Desktop** abierto y el sistema local funcionando (solo para copiar los datos, paso 4).
- Las claves de IA que uses hoy en tu `.env` (Groq u OpenAI), si quieres el asistente con IA en la nube.

---

## Paso 1 · Crear la cuenta de Vercel

1. Entra en <https://vercel.com/signup>.
2. Elige **Hobby** («I'm working on personal projects») y escribe tu nombre.
3. Pulsa **Continue with GitHub** y autoriza a Vercel.

## Paso 2 · Publicar la API (backend)

1. En el panel de Vercel: **Add New… → Project**.
2. En *Import Git Repository* busca `Procesos-`. Si no aparece, pulsa **Adjust GitHub App Permissions**
   y da acceso a ese repositorio. Luego pulsa **Import**.
3. Configura:
   - **Project Name:** `guiosad-api`
   - **Root Directory:** pulsa **Edit** y elige `GUIOSPRO_FLOSS-main 2/backend`.
   - **Framework Preset:** debe salir **Django** solo (Vercel lo detecta por `manage.py`).
4. Despliega **Environment Variables** y añade:

   | Nombre | Valor |
   |---|---|
   | `SECRET_KEY` | Una cadena larga y aleatoria (al menos 50 caracteres; no la compartas). |
   | `DEBUG` | `False` |
   | `IA_PROVEEDOR` | `groq` (o `openai` si tienes saldo en OpenAI) |
   | `LIT_PROVEEDOR_IA` | `groq` |
   | `LIT_CLASIFICADOR` | `groq` |
   | `GROQ_API_KEYS` | Tus claves de Groq separadas por comas (las de tu `.env`) |
   | `OPENAI_API_KEY` | Solo si usas OpenAI |

   Sin claves de IA el sistema funciona igual: la interfaz oculta el asistente.
5. Pulsa **Deploy** y espera a que termine (1–3 minutos). Todavía no tiene base de datos: es normal.

## Paso 3 · Crear la base de datos (Neon, gratis)

1. Entra en el proyecto `guiosad-api` → pestaña **Storage** → **Create Database**.
2. Elige **Neon — Serverless Postgres** → **Continue**.
3. Plan **Free**. Región: la más cercana (por ejemplo *Washington, D.C. (iad1)*). Nombre: `guiosad`.
4. En *Connect Project* marca los entornos **Production** y **Preview** → **Connect**.
   Vercel crea solo las variables `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
5. Vuelve a desplegar para que la API las use: pestaña **Deployments** → en el último,
   menú **⋯** → **Redeploy**.

## Paso 4 · Copiar tus datos a la nube

Esto copia tu base local (evaluaciones, corridas de literatura y catálogo) a Neon y crea las tablas.

1. En Vercel: `guiosad-api` → **Settings → Environment Variables** → busca `DATABASE_URL_UNPOOLED`,
   pulsa el ojo y copia el valor (empieza por `postgresql://`).
2. Con Docker en marcha, abre PowerShell en la carpeta que contiene `docker-compose.yml` y ejecuta
   (pega tu valor entre las comillas):

   ```powershell
   .\copiar_base_a_neon.ps1 -NeonUrl "postgresql://...pega-aqui..."
   ```

   Si PowerShell no deja ejecutar scripts, antes ejecuta en esa misma ventana:
   `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

3. Comprueba la API en el navegador: `https://guiosad-api.vercel.app/api/factores/`
   (cambia el dominio por el tuyo). Debe mostrar los 18 factores en JSON.

## Paso 5 · Publicar la interfaz (frontend)

1. **Add New… → Project** → importa de nuevo `Procesos-`.
2. Configura:
   - **Project Name:** `guiosad`
   - **Root Directory:** `GUIOSPRO_FLOSS-main 2/frontend`
   - **Framework Preset:** **Vite** (lo detecta solo).
3. **Environment Variables:**

   | Nombre | Valor |
   |---|---|
   | `VITE_API_URL` | La dirección de tu API **sin barra final**, por ejemplo `https://guiosad-api.vercel.app` |

4. **Deploy**. Al terminar, pulsa **Visit**: esa es la dirección pública del sistema.

---

## Actualizar después

- Cada `git push` a `master` vuelve a desplegar los dos proyectos solos.
- Si cambias `VITE_API_URL` u otra variable, haz **Redeploy** del proyecto correspondiente.
- La base de la nube es independiente de la local: lo que se evalúa en la web queda en Neon.
  Para volver a subir los datos locales, repite el paso 4 (**reemplaza** lo que haya en la nube).

## Diferencias con la instalación local

| Función | En Vercel |
|---|---|
| Evaluar (asistente y plantilla), historial, panel, exportar PDF/Excel | ✅ Igual |
| Asistente e informe con IA | ✅ Con las claves configuradas en el paso 2 |
| Literatura IA: ver corridas, tabla de resultados, comparar, aplicar/revertir IS | ✅ Igual |
| Literatura IA: **lanzar corridas nuevas** | ⛔ No disponible. Una corrida tarda minutos y Vercel corta cada petición. Lánzala en Docker y súbela con el paso 4. |

La variable `LIT_CORRIDAS_HABILITADAS` controla esto (por defecto `False` en Vercel y `True` en Docker).

## Avisos importantes

- **El sistema no tiene inicio de sesión.** Quien conozca la dirección puede ver, crear y borrar
  evaluaciones, y usar el asistente con tus claves de IA. Comparte la dirección solo con quien deba usarla.
- Las claves van **solo** en las variables de entorno de Vercel, nunca en el código ni en GitHub.
- Neon Free se «duerme» sin uso: la primera petición tras un rato tarda uno o dos segundos más.
- Vercel limita los archivos subidos a 4,5 MB; una plantilla llena pesa unos 15 KB.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| La interfaz abre pero no muestra datos | Revisa `VITE_API_URL` en el proyecto `guiosad` (sin `/` al final) y haz Redeploy. |
| La API responde *Bad Request (400)* | Si definiste `ALLOWED_HOSTS`, incluye tu dominio o bórrala (por defecto acepta cualquiera). |
| La API da error 500 al abrir | Falta la base o los datos: revisa el paso 3 (Redeploy) y el paso 4. |
| `copiar_base_a_neon.ps1` falla en el paso 2 | Usa `DATABASE_URL_UNPOOLED` (sin «-pooler» en el host) y comprueba que Docker está en marcha. |
| No aparece el asistente con IA | Revisa `IA_PROVEEDOR` y la clave correspondiente; haz Redeploy. |
