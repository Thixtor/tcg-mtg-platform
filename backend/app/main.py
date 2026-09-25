import os
import random
import psycopg2
from typing import List, Optional
from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

# Herramientas internas
from app.database import get_db
from app.models import CartaScryfall, User
from app.schemas import CardResponse, UserCreate, UserResponse, RequestCodePayload, VerifyCodePayload

# Instancia principal de FastAPI
app = FastAPI(
    title="TCG Card Market API",
    description="Backend para búsqueda, colecciones e intercambio de cartas MTG",
    version="1.0.0"
)

# Configuración de CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

# ---------------------------------------------------------
# RUTAS DE DIAGNÓSTICO
# ---------------------------------------------------------
@app.get("/", tags=["Diagnóstico"])
def read_root():
    return {"status": "online", "mensaje": "Servidor backend de TCG funcionando"}


# ---------------------------------------------------------
# RUTAS DEL CATÁLOGO DE CARTAS (Buscador Scryfall)
# ---------------------------------------------------------
@app.get("/api/cards/search", response_model=List[CardResponse], tags=["Cartas"])
def search_cards(
    q: str = Query(..., min_length=2, description="Texto a buscar"),
    set_code: Optional[str] = Query(None, description="Código de set"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(CartaScryfall).filter(CartaScryfall.name.ilike(f"%{q}%"))
    if set_code:
        query = query.filter(func.lower(CartaScryfall.set) == set_code.lower())
    return query.offset(offset).limit(limit).all()


@app.get("/api/cards/{card_id}", response_model=CardResponse, tags=["Cartas"])
def get_card_by_id(card_id: str, db: Session = Depends(get_db)):
    card = db.query(CartaScryfall).filter(CartaScryfall.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Carta no encontrada")
    return card


# ---------------------------------------------------------
# RUTAS DE USUARIOS Y VERIFICACIÓN POR CELULAR (Opción C)
# ---------------------------------------------------------
@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Usuarios & Auth"])
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registra un nuevo usuario y genera automáticamente el primer código OTP."""
    # Verificar unicidad
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    if db.query(User).filter(User.phone_number == user_data.phone_number).first():
        raise HTTPException(status_code=400, detail="El número de teléfono ya está registrado")

    # Generar código OTP de 6 dígitos
    otp_code = f"{random.randint(100000, 999999)}"

    nuevo_usuario = User(
        username=user_data.username,
        email=user_data.email,
        phone_number=user_data.phone_number,
        is_phone_verified=False,
        verification_code=otp_code
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # Simulación de envío por WhatsApp / Consola
    print("\n" + "="*50)
    print(f"📱 [DEV WHATSAPP SIMULATOR] Mensaje enviado a {user_data.phone_number}")
    print(f"🔑 Tu código de verificación es: {otp_code}")
    print("="*50 + "\n")

    return nuevo_usuario


@app.post("/api/auth/request-code", tags=["Usuarios & Auth"])
def request_verification_code(payload: RequestCodePayload, db: Session = Depends(get_db)):
    """Reenvía o genera un nuevo código OTP para un número registrado."""
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Número de teléfono no registrado")

    otp_code = f"{random.randint(100000, 999999)}"
    user.verification_code = otp_code
    db.commit()

    print("\n" + "="*50)
    print(f"📱 [DEV WHATSAPP SIMULATOR] Reenvío de código a {payload.phone_number}")
    print(f"🔑 Tu nuevo código es: {otp_code}")
    print("="*50 + "\n")

    return {"mensaje": "Código enviado con éxito (revisa la consola del servidor)"}


@app.post("/api/auth/verify-code", tags=["Usuarios & Auth"])
def verify_phone_code(payload: VerifyCodePayload, db: Session = Depends(get_db)):
    """Valida el código OTP e identifica al usuario como verificado."""
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Número de teléfono no encontrado")

    if user.is_phone_verified:
        return {"mensaje": "Este número ya ha sido verificado previamente", "verified": True}

    if user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto")

    # Marcar como verificado y limpiar el código de un solo uso
    user.is_phone_verified = True
    user.verification_code = None
    db.commit()

    return {
        "mensaje": "¡Número de celular verificado exitosamente!",
        "verified": True,
        "user_id": user.id,
        "username": user.username
    }