# app/database.py
# ============================================================================
# MOTOR Y SESIONES DE BASE DE DATOS (POSTGRESQL - ENFORCED PSYCOPG2 DRIVER)
# ============================================================================
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

# 1. Recuperar URL cruda directamente desde entorno o settings
raw_url = os.getenv("DATABASE_URL")
if not raw_url:
    try:
        from app.core.config import settings
        if hasattr(settings, "DATABASE_URL"):
            raw_url = str(settings.DATABASE_URL)
    except Exception:
        raw_url = "postgresql://postgres:postgres@localhost:5432/railway"

raw_url = (raw_url or "").strip().strip('"').strip("'")

# 2. Forzar explícitamente el dialecto postgresql+psycopg2
if raw_url.startswith("postgres://"):
    db_url = re.sub(r"^postgres://", "postgresql+psycopg2://", raw_url)
elif raw_url.startswith("postgresql://"):
    db_url = re.sub(r"^postgresql://", "postgresql+psycopg2://", raw_url)
elif "postgresql+" in raw_url and not raw_url.startswith("postgresql+psycopg2://"):
    db_url = re.sub(r"^postgresql\+[a-zA-Z0-9_]+://", "postgresql+psycopg2://", raw_url)
else:
    db_url = raw_url

# Opciones de conexión psycopg2 contra el proxy TCP de Railway
connect_args = {
    "keepalives": 1,
    "keepalives_idle": 15,
    "keepalives_interval": 5,
    "keepalives_count": 3,
    "connect_timeout": 30,
}

# En entornos de CI o scripts ETL masivos (definido por flag o por script) se prefiere NullPool
# para evitar cortes de socket intermedios (error e3q8).
USE_NULL_POOL = os.getenv("DB_USE_NULL_POOL", "false").lower() == "true"

engine = create_engine(
    db_url,
    poolclass=NullPool if USE_NULL_POOL else None,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args,
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