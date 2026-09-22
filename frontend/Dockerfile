# 1. Imagen base oficial de Node 20 en versión Debian ligera
FROM --platform=linux/amd64 node:20-bullseye-slim

# 2. Carpeta interna de trabajo
WORKDIR /app

# 3. Copia de manifiestos de librerías
COPY package*.json ./

# 4. Ajustes de reintento de red para evitar cortes de descarga y ejecución de instalación
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

# 5. Copia del resto del código de la aplicación
COPY . .

# 6. Puerto expuesto
EXPOSE 3000

# 7. Ejecutar Vite accesible externamente desde el puerto 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]