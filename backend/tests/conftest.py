import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# 1. Variables de entorno seguras para testing antes de importar la app
os.environ["ENVIRONMENT"] = "testing"
os.environ["SECRET_KEY"] = "clave_de_pruebas_super_secreta_y_segura_de_mas_de_32_caracteres"
os.environ["EXPOSE_DEV_OTP"] = "False"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database import Base, get_db
from app.main import app
from app.models import User, Collection, CartaScryfall
from app.core.security import create_access_token

# 2. Base de datos SQLite en memoria para tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

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