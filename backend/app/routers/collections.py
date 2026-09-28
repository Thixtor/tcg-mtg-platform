from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, contains_eager

from app.database import get_db
from app.core.security import get_current_user
from app.models import User, Collection, UserCard, CartaScryfall
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    AddCardToCollectionPayload,
    UserCardResponse,
    TradeMarketItemResponse
)

router = APIRouter(
    tags=["Colecciones y Mercado de Intercambio"]
)


# ---------------------------------------------------------
# 1. GESTIÓN DE COLECCIONES (BINDERS)
# ---------------------------------------------------------
@router.post(
    "/collections",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una colección o binder para el usuario autenticado"
)
def create_collection(
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conteo_actual = db.query(Collection).filter(Collection.user_id == current_user.id).count()
    if conteo_actual >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Has alcanzado el límite máximo permitido de 10 colecciones/binders."
        )

    nueva_coleccion = Collection(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description
    )
    db.add(nueva_coleccion)
    db.commit()
    db.refresh(nueva_coleccion)
    return nueva_coleccion


@router.get(
    "/collections/me",
    response_model=List[CollectionResponse],
    summary="Listar las colecciones del usuario autenticado"
)
def list_my_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Collection).filter(Collection.user_id == current_user.id).all()


@router.get(
    "/users/{user_id}/collections",
    response_model=List[CollectionResponse],
    summary="Listar las colecciones públicas de un usuario"
)
def list_user_collections(
    user_id: str,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return db.query(Collection).filter(Collection.user_id == user_id).all()


# ---------------------------------------------------------
# 2. CARTAS DENTRO DE UNA COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
@router.post(
    "/collections/{collection_id}/cards",
    response_model=UserCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una carta física a una colección propia"
)
def add_card_to_collection(
    collection_id: str,
    payload: AddCardToCollectionPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificación de propiedad (Ownership) para evitar IDOR
    coleccion = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id
    ).first()
    if not coleccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colección no encontrada o no tienes permisos sobre ella."
        )

    carta_catalogo = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
    if not carta_catalogo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La carta '{payload.scryfall_card_id}' no existe en el catálogo Scryfall."
        )

    nueva_carta = UserCard(
        collection_id=collection_id,
        scryfall_card_id=payload.scryfall_card_id,
        quantity=payload.quantity,
        condition=payload.condition,
        language=payload.language,
        is_foil=payload.is_foil,
        is_for_trade=payload.is_for_trade,
        trade_notes=payload.trade_notes
    )
    db.add(nueva_carta)
    db.commit()
    db.refresh(nueva_carta)
    return nueva_carta


@router.get(
    "/collections/{collection_id}/cards",
    response_model=List[UserCardResponse],
    summary="Listar las cartas contenidas en una colección"
)
def list_cards_in_collection(
    collection_id: str,
    db: Session = Depends(get_db)
):
    coleccion = db.query(Collection).filter(Collection.id == collection_id).first()
    if not coleccion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colección no encontrada.")

    return (
        db.query(UserCard)
        .options(joinedload(UserCard.card_catalog))
        .filter(UserCard.collection_id == collection_id)
        .all()
    )


# ---------------------------------------------------------
# 3. MURO PÚBLICO DEL MERCADO (TRADE MARKET)
# ---------------------------------------------------------
@router.get(
    "/trade/market",
    response_model=List[TradeMarketItemResponse],
    summary="Listar cartas para intercambio (sin exponer teléfonos de terceros)"
)
def get_trade_market(
    limit: int = 24,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Retorna cartas disponibles para trade usando joinedload para evitar N+1
    y omitiendo datos de contacto privado hasta que haya acuerdo mutuo.
    """
    items_trade = (
        db.query(UserCard)
        .join(UserCard.collection)
        .join(Collection.owner)
        .options(
            joinedload(UserCard.card_catalog),
            contains_eager(UserCard.collection).contains_eager(Collection.owner)
        )
        .filter(UserCard.is_for_trade.is_(True))
        .order_by(UserCard.id.desc())
        .offset(offset)
        .limit(min(limit, 100))
        .all()
    )

    respuesta = []
    for item in items_trade:
        respuesta.append(
            TradeMarketItemResponse(
                user_card_id=item.id,
                card_name=item.card_catalog.name,
                set_code=item.card_catalog.set,
                image_url=item.card_catalog.image_url,
                condition=item.condition,
                language=item.language,
                is_foil=item.is_foil,
                trade_notes=item.trade_notes,
                owner_username=item.collection.owner.username,
                owner_reputation=item.collection.owner.reputation_score
            )
        )
    return respuesta