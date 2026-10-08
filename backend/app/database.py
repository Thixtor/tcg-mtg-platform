# app/database.py
# ============================================================================
# MOTOR Y SESIONES DE BASE DE DATOS (POSTGRESQL - ENFORCED PSYCOPG2 DRIVER)
# ============================================================================
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Recuperar URL cruda desde entorno o settings
raw_url = os.getenv("DATABASE_URL")
if not raw_url and hasattr(settings, "DATABASE_URL"):
    raw_url = str(settings.DATABASE_URL)

raw_url = (raw_url or "").strip().strip('"').strip("'")

# 2. Forzar explícitamente el dialecto postgresql+psycopg2
#    Evita que SQLAlchemy intente resolver psycopg3 ('import psycopg')
if raw_url.startswith("postgres://"):
    db_url = re.sub(r"^postgres://", "postgresql+psycopg2://", raw_url)
elif raw_url.startswith("postgresql://"):
    db_url = re.sub(r"^postgresql://", "postgresql+psycopg2://", raw_url)
elif "postgresql+" in raw_url and not raw_url.startswith("postgresql+psycopg2://"):
    db_url = re.sub(r"^postgresql\+[a-zA-Z0-9_]+://", "postgresql+psycopg2://", raw_url)
else:
    db_url = raw_url

# ---------------------------------------------------------
# INICIALIZACIÓN DEL MOTOR SQLALCHEMY
# ---------------------------------------------------------
engine = create_engine(
    db_url,
    pool_pre_ping=True,      # Verifica conectividad antes de checkout
    pool_recycle=1800,       # Recicla cada 30 min (evita timeouts en Railway)
    pool_size=10,
    max_overflow=20,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Generador de sesión SQLAlchemy para inyección de dependencias."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()