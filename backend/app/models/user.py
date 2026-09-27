import uuid
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


# ---------------------------------------------------------
# 2. USUARIOS CON VERIFICACIÓN POR CELULAR
# ---------------------------------------------------------
class User(Base):
    """
    Entidad de usuario con validación de identidad para intercambios seguros.
    """
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

    # Verificación OTP celular y reputación
    phone_number = Column(String, unique=True, index=True, nullable=False)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    verification_code = Column(String, nullable=True)
    reputation_score = Column(Integer, default=100)

    # Relaciones
    collections = relationship("Collection", back_populates="owner", cascade="all, delete-orphan")