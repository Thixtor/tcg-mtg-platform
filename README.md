# **MTG Card Market & Analytics Platform**

Aplicación web Full Stack para la gestión, consulta de precios y análisis de cartas de Magic: The Gathering (MTG). Desarrollada con arquitectura de microservicios contenerizada con Docker.

# **🛠️ Stack Tecnológico**

La plataforma utiliza un ecosistema de tecnologías modernas para garantizar escalabilidad y rendimiento:


* **Backend:** FastAPI (Python 3.9) \+ Uvicorn para una gestión eficiente de peticiones asíncronas.  
* **Base de Datos:** PostgreSQL 15 como motor relacional para la persistencia de datos de mercado.  
* **Frontend:** React con Vite (Node.js) para una interfaz de usuario reactiva y optimizada.  
* **Infraestructura:** Docker & Docker Compose para la orquestación y despliegue consistente entre entornos.

# **📁 Estructura del Proyecto**

mi-proyecto-tcg/


├── docker-compose.yml       \# Orquestación de servicios locales
├── README.md                \# Documentación del proyecto
├── backend/
│   ├── Dockerfile           \# Imagen de Python \+ dependencias del sistema
│   ├── requirements.txt     \# Dependencias de Python (FastAPI, psycopg2, uvicorn...)
│   └── main.py              \# Punto de entrada de la API
└── frontend/
    ├── Dockerfile           \# Imagen del frontend
    ├── package.json         \# Dependencias y scripts de npm
    └── vite.config.js       \# Configuración del servidor de desarrollo

# **🚀 Requisitos Previos**

Antes de iniciar el despliegue, asegúrese de contar con las siguientes herramientas instaladas:

1. **Docker Desktop:** Instalado y en ejecución en el sistema.  
2. **Git:** Para el control de versiones y clonación del código fuente.

# **⚙️ Puesta en Marcha (Despliegue Local)**

## **1\. Clonar el repositorio**

Ejecute los siguientes comandos para obtener una copia local del código:

git clone Person  
cd File

## **2\. Construir y levantar los contenedores**

Para construir las imágenes por primera vez y levantar todos los servicios en segundo plano, utilice el comando:

`docker compose up -d --build`

## **3\. Verificar el estado de los servicios**

Confirme que todos los contenedores se estén ejecutando correctamente:

`docker compose ps`

# **🌐 Servicios y Puertos**

| Servicio | Acceso Local | Descripción |
| :---- | :---- | :---- |
| API Backend | http://localhost:8000 | Puntos de enlace de la API REST |
| Swagger UI Docs | http://localhost:8000/docs | Documentación interactiva autogenerada |
| Frontend Web | http://localhost:3000 | Interfaz de usuario final |
| PostgreSQL | localhost:5432 | Base de datos relacional del sistema |

# **🛠️ Comandos Útiles**

A continuación se detallan los comandos más frecuentes para el mantenimiento del entorno de desarrollo:

* **Ver registros (logs) del backend:**  
  `docker compose logs -f backend`  
* **Acceder a la terminal dentro del contenedor backend:**  
  `docker compose exec backend bash`  
* **Detener los servicios sin borrar datos:**  
  `docker compose down`  
* **Reconstruir un servicio específico tras cambios en dependencias:**  
  `docker compose build --no-cache backend`  
  `docker compose up -d backend`
