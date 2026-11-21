# Copia la base de datos local (Docker) a la base de la nube (Neon) y aplica
# las migraciones pendientes. Se usa una vez, al publicar en Vercel, y cada vez
# que se quiera volver a subir los datos locales.
#
# Uso (PowerShell, en la carpeta que contiene docker-compose.yml, con Docker en marcha):
#   .\copiar_base_a_neon.ps1 -NeonUrl "postgresql://usuario:clave@host/neondb?sslmode=require"
#
# Use la cadena SIN pooler (en Vercel: variable DATABASE_URL_UNPOOLED).
# ATENCIÓN: reemplaza el contenido de la base de destino.
param(
    [Parameter(Mandatory = $true)][string]$NeonUrl
)
# Docker escribe mensajes informativos por stderr: no se tratan como error;
# cada paso se comprueba con su código de salida.
$ErrorActionPreference = 'Continue'

$usuario = (docker compose exec -T db printenv POSTGRES_USER).Trim()
$base = (docker compose exec -T db printenv POSTGRES_DB).Trim()

Write-Host "1/4 Exportando la base local '$base'..."
docker compose exec -T db pg_dump -U $usuario -d $base -Fc -f /tmp/nube.dump
if ($LASTEXITCODE -ne 0) { throw 'No se pudo exportar la base local. ¿Está Docker en marcha?' }

Write-Host '2/4 Cargando los datos en la nube (puede tardar un minuto)...'
docker compose exec -T db pg_restore --no-owner --no-privileges --clean --if-exists -d $NeonUrl /tmp/nube.dump
# pg_restore devuelve avisos inofensivos la primera vez (objetos que aún no existían).

Write-Host '3/4 Aplicando migraciones en la nube...'
docker compose run --rm --no-deps -e DATABASE_URL=$NeonUrl backend python manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) { throw 'Fallaron las migraciones en la nube. Revise la cadena de conexión.' }

Write-Host '4/4 Limpiando...'
docker compose exec -T db rm -f /tmp/nube.dump
Write-Host 'Listo: la base de la nube tiene los mismos datos que la local.'
