from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

# Dependencias internas del núcleo
from app.database import get_db
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
    "/users/{user_id}/collections",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una colección o binder para un usuario",
    description="Crea una carpeta de inventario respetando la regla de negocio de hasta 10 por usuario."
)
def create_collection(
    user_id: str,
    payload: CollectionCreate,
    db: Session = Depends(get_db)
):
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID '{user_id}' no encontrado."
        )

    # Validar límite de 10 colecciones
    conteo_actual = db.query(Collection).filter(Collection.user_id == user_id).count()
    if conteo_actual >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Has alcanzado el límite máximo permitido de 10 colecciones/binders."
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


@router.get(
    "/users/{user_id}/collections",
    response_model=List[CollectionResponse],
    summary="Listar las colecciones de un usuario"
)
def list_user_collections(
    user_id: str,
    db: Session = Depends(get_db)
):
    return db.query(Collection).filter(Collection.user_id == user_id).all()


# ---------------------------------------------------------
# 2. CARTAS DENTRO DE UNA COLECCIÓN (USER CARDS)
# ---------------------------------------------------------
@router.post(
    "/collections/{collection_id}/cards",
    response_model=UserCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una carta física a una colección"
)
def add_card_to_collection(
    collection_id: str,
    payload: AddCardToCollectionPayload,
    db: Session = Depends(get_db)
):
    coleccion = db.query(Collection).filter(Collection.id == collection_id).first()
    if not coleccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Colección con ID '{collection_id}' no encontrada."
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
    summary="Listar todas las cartas disponibles para intercambio en la plataforma"
)
def get_trade_market(
    db: Session = Depends(get_db)
):
    """
    Retorna todas las cartas marcadas con is_for_trade = True junto
    con la información pública y reputación del usuario que las ofrece.
    """
    items_trade = (
        db.query(UserCard)
        .join(Collection, UserCard.collection_id == Collection.id)
        .join(User, Collection.user_id == User.id)
        .join(CartaScryfall, UserCard.scryfall_card_id == CartaScryfall.id)
        .filter(UserCard.is_for_trade == True)
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
                owner_phone=item.collection.owner.phone_number,
                owner_reputation=item.collection.owner.reputation_score
            )
        )
    return respuesta