from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate


# ---------------------------------------------------------
# OPERACIONES DE BASE DE DATOS: USUARIOS Y AUTENTICACIÓN
# ---------------------------------------------------------
def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """
    Obtiene un usuario por su identificador UUID.
    """
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_phone(db: Session, phone_number: str) -> Optional[User]:
    """
    Busca un usuario por su número de teléfono celular.
    """
    return db.query(User).filter(User.phone_number == phone_number).first()


def get_user_by_unique_fields(
    db: Session, 
    username: str, 
    email: str, 
    phone_number: str
) -> Optional[User]:
    """
    Verifica si ya existe un registro con el mismo username, email o número telefónico.
    """
    return db.query(User).filter(
        (User.username == username) |
        (User.email == email) |
        (User.phone_number == phone_number)
    ).first()


def create_user(db: Session, payload: UserCreate) -> User:
    """
    Inserta un nuevo usuario en la base de datos con verificación celular pendiente.
    """
    nuevo_usuario = User(
        username=payload.username,
        email=payload.email,
        phone_number=payload.phone_number,
        is_phone_verified=False,
        reputation_score=100
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


def set_user_otp_code(db: Session, user: User, code: str) -> None:
    """
    Asigna un nuevo código de verificación temporal al usuario.
    """
    user.verification_code = code
    db.commit()


def mark_phone_as_verified(db: Session, user: User) -> None:
    """
    Valida la cuenta telefónica y limpia el código temporal de verificación.
    """
    user.is_phone_verified = True
    user.verification_code = None
    db.commit()