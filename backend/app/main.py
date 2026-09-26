import os
import random
import psycopg2
from typing import List, Optional
from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import CartaScryfall, User, Collection, UserCard
from app.schemas import (
    CardResponse,
    UserCreate,
    UserResponse,
    RequestCodePayload,
    VerifyCodePayload,
    CollectionCreate,
    CollectionResponse,
    AddCardToCollectionPayload,
    UserCardResponse,
    TradeMarketItemResponse
)

app = FastAPI(
    title="TCG Card Market API",
    description="Backend para búsqueda, colecciones e intercambio de cartas MTG",
    version="1.0.0"
)

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
# RUTAS DE USUARIOS Y VERIFICACIÓN POR CELULAR
# ---------------------------------------------------------
@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Usuarios & Auth"])
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    if db.query(User).filter(User.phone_number == user_data.phone_number).first():
        raise HTTPException(status_code=400, detail="El número de teléfono ya está registrado")

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

    print("\n" + "="*50)
    print(f"📱 [DEV WHATSAPP SIMULATOR] Mensaje enviado a {user_data.phone_number}")
    print(f"🔑 Tu código de verificación es: {otp_code}")
    print("="*50 + "\n")

    return nuevo_usuario


@app.post("/api/auth/request-code", tags=["Usuarios & Auth"])
def request_verification_code(payload: RequestCodePayload, db: Session = Depends(get_db)):
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
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Número de teléfono no encontrado")

    if user.is_phone_verified:
        return {"mensaje": "Este número ya ha sido verificado previamente", "verified": True}

    if user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto")

    user.is_phone_verified = True
    user.verification_code = None
    db.commit()

    return {
        "mensaje": "¡Número de celular verificado exitosamente!",
        "verified": True,
        "user_id": user.id,
        "username": user.username
    }


# ---------------------------------------------------------
# RUTAS DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
@app.post("/api/users/{user_id}/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED, tags=["Colecciones"])
def create_collection(user_id: str, payload: CollectionCreate, db: Session = Depends(get_db)):
    """Crea una colección asegurando que el usuario no supere el límite de 10 colecciones."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validación de regla de negocio: Máximo 10 colecciones
    total_collections = db.query(Collection).filter(Collection.user_id == user_id).count()
    if total_collections >= 10:
        raise HTTPException(
            status_code=400,
            detail="Has alcanzado el límite máximo de 10 colecciones por usuario."
        )

    nueva_coleccion = Collection(
        user_id=user_id,
        name=payload.name,
        description=payload.description
    )
    db.add(nueva_coleccion)
    db.commit()
    db.refresh(nueva_coleccion)
    return nueva_coleccion


@app.get("/api/users/{user_id}/collections", response_model=List[CollectionResponse], tags=["Colecciones"])
def list_user_collections(user_id: str, db: Session = Depends(get_db)):
    """Lista todas las colecciones de un usuario."""
    return db.query(Collection).filter(Collection.user_id == user_id).all()


@app.post("/api/collections/{collection_id}/cards", response_model=UserCardResponse, status_code=status.HTTP_201_CREATED, tags=["Colecciones"])
def add_card_to_collection(
    collection_id: str,
    payload: AddCardToCollectionPayload,
    db: Session = Depends(get_db)
):
    """Agrega una carta física a una colección con su estado y flag de intercambio."""
    # 1. Verificar que la colección exista
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Colección no encontrada")

    # 2. Verificar que la carta exista en el catálogo de Scryfall local
    card_catalog = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
    if not card_catalog:
        raise HTTPException(status_code=404, detail="La carta no existe en el catálogo oficial local")

    # 3. Crear el registro de la carta física
    user_card = UserCard(
        collection_id=collection_id,
        scryfall_card_id=payload.scryfall_card_id,
        quantity=payload.quantity,
        condition=payload.condition,
        language=payload.language,
        is_foil=payload.is_foil,
        is_for_trade=payload.is_for_trade,
        trade_notes=payload.trade_notes
    )
    db.add(user_card)
    db.commit()
    db.refresh(user_card)
    return user_card


@app.get("/api/collections/{collection_id}/cards", response_model=List[UserCardResponse], tags=["Colecciones"])
def list_collection_cards(collection_id: str, db: Session = Depends(get_db)):
    """Lista las cartas físicas almacenadas en una colección específica."""
    return (
        db.query(UserCard)
        .options(joinedload(UserCard.card_catalog))
        .filter(UserCard.collection_id == collection_id)
        .all()
    )


# ---------------------------------------------------------
# RUTA DE MERCADO P2P (CARTAS DISPONIBLES PARA CAMBIO)
# ---------------------------------------------------------
@app.get("/api/trade/market", response_model=List[TradeMarketItemResponse], tags=["Intercambio / Trade"])
def get_trade_market(
    card_name: Optional[str] = Query(None, description="Filtro opcional por nombre de carta"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Lista pública de todas las cartas marcadas para trade (`is_for_trade = True`)
    cuyos dueños tengan el teléfono verificado.
    """
    query = (
        db.query(UserCard)
        .join(Collection, UserCard.collection_id == Collection.id)
        .join(User, Collection.user_id == User.id)
        .join(CartaScryfall, UserCard.scryfall_card_id == CartaScryfall.id)
        .filter(UserCard.is_for_trade == True)
        .filter(User.is_phone_verified == True)
    )

    if card_name:
        query = query.filter(CartaScryfall.name.ilike(f"%{card_name}%"))

    results = query.offset(offset).limit(limit).all()

    trade_items = []
    for item in results:
        owner = item.collection.owner
        catalog = item.card_catalog
        trade_items.append(
            TradeMarketItemResponse(
                user_card_id=item.id,
                card_name=catalog.name,
                set_code=catalog.set,
                image_url=catalog.image_url,
                condition=item.condition,
                language=item.language,
                is_foil=item.is_foil,
                trade_notes=item.trade_notes,
                owner_username=owner.username,
                owner_phone=owner.phone_number,
                owner_reputation=owner.reputation_score
            )
        )
    return trade_items