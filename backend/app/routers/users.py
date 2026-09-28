# ---------------------------------------------------------
# ROUTER: USUARIOS, PERFIL P2P Y GESTIÓN DE JUGADORES
# ---------------------------------------------------------
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import random

# IMPORTANTE: Agregar esta línea para que get_db exista
from app.database import get_db

from app.models import User, Collection, UserCard

try:
    from app.models import WishlistItem
except ImportError:
    WishlistItem = None

from app.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    UserProfileKPIs,
    ProfileBinderSummary,
    PhoneVerificationRequest,
    PhoneVerificationConfirm,
    UserCreate
)

# Prefijo relativo para evitar la duplicación /api/api/...
router = APIRouter(
    prefix="/users",
    tags=["Usuarios y Perfil"]
)


# ---------------------------------------------------------
# 1. LISTAR USUARIOS (Para el selector de la Navbar en React)
# ---------------------------------------------------------
@router.get("/", response_model=List[UserProfileResponse])
def list_users(db: Session = Depends(get_db)):
    """
    Lista todos los usuarios registrados para el selector de cambio
    de perfil en la barra de navegación del frontend.
    """
    users = db.query(User).all()
    return [get_user_profile(user_id=u.id, db=db) for u in users]


# ---------------------------------------------------------
# 2. CREAR O REGISTRAR USUARIO
# ---------------------------------------------------------
@router.post("/", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo perfil de jugador en la plataforma.
    """
    existing_user = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario o correo ya se encuentra registrado."
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        phone_number=user_in.phone_number,
        location=user_in.location or "Medellín / Bello, Antioquia",
        preferred_currency="COP",
        allows_local_meetup=True,
        allows_nationwide_shipping=True,
        is_phone_verified=False,
        reputation_score=100,
        rating=5.0,
        completed_trades=0,
        disputes_count=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return get_user_profile(user_id=new_user.id, db=db)


# ---------------------------------------------------------
# 3. OBTENER PERFIL COMPLETO CON KPIS
# ---------------------------------------------------------
@router.get("/{user_id}/profile", response_model=UserProfileResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """
    Retorna los datos consolidados de identidad, reputación P2P,
    métricas de inventario (KPIs) y binders del usuario para ProfilePage.jsx.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado."
        )

    # 1. Binders del usuario
    user_collections = db.query(Collection).filter(Collection.user_id == user_id).all()
    active_binders_count = len(user_collections)
    collection_ids = [c.id for c in user_collections]

    # 2. Métricas de inventario físico
    total_cards = 0
    cards_for_trade = 0

    if collection_ids:
        total_cards_result = db.query(func.coalesce(func.sum(UserCard.quantity), 0)).filter(
            UserCard.collection_id.in_(collection_ids)
        ).scalar()
        total_cards = int(total_cards_result)

        trade_cards_result = db.query(func.coalesce(func.sum(UserCard.quantity), 0)).filter(
            UserCard.collection_id.in_(collection_ids),
            UserCard.is_for_trade == True
        ).scalar()
        cards_for_trade = int(trade_cards_result)

    # 3. Cartas en Wishlist
    wishlist_wants = 0
    if WishlistItem:
        wishlist_wants = db.query(WishlistItem).filter(WishlistItem.user_id == user_id).count()

    # 4. Formatear lista de binders
    binders_summary = []
    for c in user_collections:
        cards_in_binder = db.query(func.coalesce(func.sum(UserCard.quantity), 0)).filter(
            UserCard.collection_id == c.id
        ).scalar()
        binders_summary.append(
            ProfileBinderSummary(
                id=c.id,
                name=c.name,
                description=c.description,
                is_public_trade=getattr(c, 'is_public_trade', True),
                card_count=int(cards_in_binder),
                art_url=getattr(c, 'art_url', None) or "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60"
            )
        )

    kpis = UserProfileKPIs(
        active_binders=active_binders_count,
        max_binders=10,
        total_cards_in_collection=total_cards,
        cards_for_trade=cards_for_trade,
        wishlist_wants=wishlist_wants
    )

    return UserProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        phone_number=user.phone_number,
        is_phone_verified=user.is_phone_verified,
        avatar_url=user.avatar_url,
        bio=user.bio,
        location=user.location,
        created_at=user.created_at,
        preferred_currency=user.preferred_currency or "COP",
        allows_local_meetup=user.allows_local_meetup if user.allows_local_meetup is not None else True,
        allows_nationwide_shipping=user.allows_nationwide_shipping if user.allows_nationwide_shipping is not None else True,
        reputation_score=user.reputation_score or 100,
        rating=user.rating or 5.0,
        completed_trades=user.completed_trades or 0,
        disputes_count=user.disputes_count or 0,
        kpis=kpis,
        binders=binders_summary
    )


# ---------------------------------------------------------
# 4. ACTUALIZAR INFORMACIÓN DEL PERFIL Y PREFERENCIAS
# ---------------------------------------------------------
@router.put("/{user_id}/profile", response_model=UserProfileResponse)
def update_user_profile(user_id: str, profile_in: UserProfileUpdate, db: Session = Depends(get_db)):
    """
    Actualiza la biografía, ubicación y flags de preferencias comerciales.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado."
        )

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return get_user_profile(user_id=user.id, db=db)


# ---------------------------------------------------------
# 5. SEGURIDAD: SOLICITUD Y CONFIRMACIÓN DE OTP CELULAR
# ---------------------------------------------------------
@router.post("/{user_id}/verify-phone/request")
def request_phone_verification(user_id: str, req: PhoneVerificationRequest, db: Session = Depends(get_db)):
    """
    Genera un código OTP simulado de 6 dígitos para validar el número de teléfono.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    generated_code = f"{random.randint(100000, 999999)}"
    user.phone_number = req.phone_number
    user.verification_code = generated_code
    user.is_phone_verified = False

    db.commit()

    print("\n" + "=" * 50)
    print(f"📱 [DEV WHATSAPP OTP] Mensaje enviado a {req.phone_number}")
    print(f"🔑 Tu código de verificación es: {generated_code}")
    print("=" * 50 + "\n")

    return {
        "status": "success",
        "message": f"Código de verificación enviado al {req.phone_number}.",
        "dev_code": generated_code
    }


@router.post("/{user_id}/verify-phone/confirm")
def confirm_phone_verification(user_id: str, confirm_in: PhoneVerificationConfirm, db: Session = Depends(get_db)):
    """
    Valida el código OTP introducido por el usuario y activa su verificación.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if not user.verification_code or user.verification_code != confirm_in.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de verificación incorrecto o expirado."
        )

    user.is_phone_verified = True
    user.verification_code = None
    db.commit()

    return {
        "status": "success",
        "message": "Teléfono verificado exitosamente. Tu perfil ahora cuenta con el sello de Trader Verificado.",
        "is_phone_verified": True
    }