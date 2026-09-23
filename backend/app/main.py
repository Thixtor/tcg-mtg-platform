import os
import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. Crear la instancia principal de la API
app = FastAPI(
    title="TCG Card Market API",
    description="Backend para la plataforma de intercambio y gestión de cartas",
    version="1.0.0"
)

# 2. Configurar CORS (Permisos de conexión)
# Permite que el frontend (React en el puerto 3000) pueda pedir datos sin que el navegador lo bloquee
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Dominios autorizados a conectarse
    allow_credentials=True,      # Permite envío de cookies o cabeceras de autenticación
    allow_methods=["*"],         # Permite todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],         # Permite todas las cabeceras HTTP
)

# 3. Obtener la cadena de conexión a la base de datos desde las variables de entorno de Docker
DATABASE_URL = os.getenv("DATABASE_URL")

# 4. Ruta raíz de verificación
@app.get("/")
def read_root():
    """
    Ruta básica para comprobar que el backend está encendido y respondiendo.
    """
    return {
        "status": "online",
        "mensaje": "Servidor backend de TCG funcionando correctamente"
    }

# 5. Ruta para probar la conexión con PostgreSQL
@app.get("/db-test")
def test_db_connection():
    """
    Ruta para verificar que FastAPI puede conectarse a la base de datos PostgreSQL.
    """
    try:
        # Abre la conexión con PostgreSQL usando la URL del docker-compose
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Ejecuta una consulta sencilla de prueba
        cur.execute("SELECT version();")
        db_version = cur.fetchone()
        
        # Cierra el cursor y la conexión
        cur.close()
        conn.close()
        
        return {
            "status": "success",
            "mensaje": "Conexión exitosa a PostgreSQL",
            "version": db_version[0]
        }
    except Exception as error:
        return {
            "status": "error",
            "mensaje": "No se pudo conectar a la base de datos",
            "detalle": str(error)
        }