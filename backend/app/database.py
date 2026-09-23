import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Cargar las variables del archivo .env al entorno de Python
load_dotenv()

# Idealmente, esta URL la leeremos de un archivo .env por seguridad
# Formato: postgresql://usuario:contraseña@servidor:puerto/nombre_bd
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost:5432/mtg_catalog"
)

# Creamos el motor de conexión
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Creamos una fábrica de sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán nuestros modelos (como el que hicimos en models.py)
Base = declarative_base()

# Dependencia de FastAPI para obtener la sesión de la base de datos y cerrarla al terminar
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()