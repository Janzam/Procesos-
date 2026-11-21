# Plantillas de evaluación

Archivos para probar **Evaluar con plantilla** (menú lateral → *Evaluar con plantilla*).

| Archivo | Para qué sirve |
|---|---|
| `plantilla_guiosad.xlsx` | Plantilla en blanco, generada con el catálogo por defecto (importancia sugerida de la Tabla 5.3). Se llena y se sube. |
| `ejemplo_mattermost.xlsx` | La misma plantilla ya llena (Mattermost 9.11) para subirla directamente y ver un resultado. |

## Cómo probar

1. Levanta el sistema (`docker compose up -d --build`) y abre `http://localhost:3001`.
2. Entra en **Evaluar con plantilla** y arrastra `ejemplo_mattermost.xlsx` a la zona de subida.
3. El sistema crea la evaluación, la calcula con el mismo motor que el asistente y abre el resultado en el historial.

Para evaluar otro sistema, lo recomendable es pulsar **Descargar plantilla** en la propia página:
se genera en el momento con el catálogo vigente. Si se ha aplicado una corrida de
*Literatura IA*, la importancia sugerida cambia y la plantilla descargada lo refleja; una
plantilla antigua se sigue aceptando, con un aviso.

## Desactivar la función

La evaluación con plantilla es opcional. Con `PLANTILLA_HABILITADA=False` en el `.env` y
`docker compose up -d` se ocultan la página, el acceso directo del asistente y sus rutas
de la API. El resto del sistema no depende de ella y las evaluaciones ya importadas se
siguen viendo en el historial.
