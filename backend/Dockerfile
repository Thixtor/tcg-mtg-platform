# Usar Python 3.12 slim moderno
FROM python:3.12-slim

# Evitar escritura de bytecode y habilitar buffer en stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias de Python (psycopg2-binary no requiere gcc ni libpq-dev)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente de la aplicación
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

# Crear usuario sin privilegios por seguridad
RUN useradd -r -u 10001 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Verificación de salud periódica sin necesidad de instalar curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/')" || exit 1

# Comando productivo: sin --reload, con proxy-headers para reverse proxy (Nginx/Traefik)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--workers", "2"]