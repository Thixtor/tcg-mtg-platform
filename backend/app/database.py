from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# ---------------------------------------------------------
# MOTOR Y SESIONES DE BASE DE DATOS (POSTGRESQL)
# ---------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
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