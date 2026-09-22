# Usar una imagen ligera de Python
FROM python:3.9-slim

WORKDIR /app

# Instalar dependencias necesarias del sistema (para compilar psycopg2 y utilidades de red)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivo de requerimientos e instalar paquetes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente de la aplicación
COPY . .

# Exponer el puerto del servidor
EXPOSE 8000

# Comando para iniciar la API con recarga automática para desarrollo
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]