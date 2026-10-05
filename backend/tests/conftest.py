# tests/conftest.py
# -----------------------------------------------------------------------------
# CONFIGURACIÓN GLOBAL DE TESTING (PYTEST + FASTAPI + POSTGRESQL/SQLITE DUAL)
# -----------------------------------------------------------------------------
import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool, NullPool

# 1. Variables de entorno seguras para testing
os.environ["ENVIRONMENT"] = "testing"
os.environ["SECRET_KEY"] = os.getenv(
    "SECRET_KEY", 
    "clave_de_pruebas_super_secreta_y_segura_de_mas_de_32_caracteres"
)
os.environ["EXPOSE_DEV_OTP"] = "False"

# URL de base de datos para tests
raw_test_db_url = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")

# Normalizar esquema a psycopg2 si se pasa postgresql:// genérico
if raw_test_db_url.startswith("postgresql://"):
    raw_test_db_url = raw_test_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

TEST_DB_URL = raw_test_db_url
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.database import Base, get_db
from app.main import app
from app.models import User, Collection, CartaScryfall
from app.core.security import create_access_token

# 2. Configuración del motor según dialecto
is_sqlite = TEST_DB_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL testing: NullPool evita retener conexiones entre hilos de test
    engine = create_engine(
        TEST_DB_URL,
        poolclass=NullPool,
    )

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Inicializa el esquema si es SQLite en memoria."""
    if is_sqlite:
        Base.metadata.create_all(bind=engine)
        yield
        Base.metadata.drop_all(bind=engine)
    else:
        # En PostgreSQL preservamos el esquema gestionado por Alembic
        yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """
    Entrega una sesión aislada por test con rollback transaccional automático.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(db_sess, trans):
        nonlocal nested
        if trans.nested and not trans._parent.nested:
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_a(db_session: Session) -> User:
    user = User(
        id="user-uuid-aaa-111",
        username="trader_alpha",
        email="alpha@example.com",
        phone_number="+573001112233",
        is_phone_verified=True,
        reputation_score=100,
        rating=5.0
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_user_b(db_session: Session) -> User:
    user = User(
        id="user-uuid-bbb-222",
        username="trader_beta",
        email="beta@example.com",
        phone_number="+573004445566",
        is_phone_verified=True,
        reputation_score=95,
        rating=4.8
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers_user_a(test_user_a: User) -> dict:
    token = create_access_token(user_id=test_user_a.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_user_b(test_user_b: User) -> dict:
    token = create_access_token(user_id=test_user_b.id)
    return {"Authorization": f"Bearer {token}"}