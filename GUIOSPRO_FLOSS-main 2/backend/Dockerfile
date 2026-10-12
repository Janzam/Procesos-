FROM python:3.11-slim

# Sin .pyc en el contenedor y con la salida sin almacenar en búfer, para que los
# mensajes de arranque aparezcan en «docker compose logs» en el momento.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Las dependencias se copian e instalan antes que el código: mientras
# requirements.txt no cambie, Docker reutiliza esta capa en cada reconstrucción.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "guiosad.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
