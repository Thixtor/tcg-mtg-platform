# app/database.py
# ============================================================================
# MOTOR Y SESIONES DE BASE DE DATOS (POSTGRESQL - ENFORCED PSYCOPG2 DRIVER)
# ============================================================================
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Recuperar URL cruda directamente desde entorno del sistema o intentar fallback a settings
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

# ---------------------------------------------------------
# INICIALIZACIÓN DEL MOTOR SQLALCHEMY CON TCP KEEPALIVES
# ---------------------------------------------------------
engine = create_engine(
    db_url,
    pool_pre_ping=True,       # Verifica conectividad antes de checkout
    pool_recycle=300,         # Recicla cada 5 min para evitar timeouts con proxies TCP
    pool_size=10,
    max_overflow=20,
    echo=False,
    connect_args={
        # Evita 'SSL SYSCALL error: EOF detected' en proxies como Railway
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }
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