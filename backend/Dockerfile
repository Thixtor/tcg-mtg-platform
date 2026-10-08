# ---------------------------------------------------------
# DOCKERFILE: BACKEND FASTAPI (PYTHON) - RAILWAY READY
# ---------------------------------------------------------
FROM python:3.11-slim

# Evitar escritura de bytecode .pyc y forzar buffer directo en stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para PostgreSQL y compilaciones C
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente de la aplicación
COPY . .

# Puerto por defecto (documentario)
EXPOSE 8000

# Arranque compatible con Railway: evalúa $PORT dinámico si existe, o 8000 como fallback
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]