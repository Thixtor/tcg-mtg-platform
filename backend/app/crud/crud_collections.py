from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.collection import Collection, UserCard
from app.schemas.collection import CollectionCreate, AddCardToCollectionPayload


# ---------------------------------------------------------
# OPERACIONES DE BASE DE DATOS: COLECCIONES Y BINDERS
# ---------------------------------------------------------
def count_user_collections(db: Session, user_id: str) -> int:
    """
    Cuenta el total de colecciones registradas por un usuario.
    """
    return db.query(Collection).filter(Collection.user_id == user_id).count()


def create_collection(db: Session, user_id: str, payload: CollectionCreate) -> Collection:
    """
    Crea un nuevo binder para el usuario.
    """
    nueva_coleccion = Collection(
        user_id=user_id,
        name=payload.name,
        description=payload.description
    )
    db.add(nueva_coleccion)
    db.commit()
    db.refresh(nueva_coleccion)
    return nueva_coleccion


def get_collections_by_user(db: Session, user_id: str) -> List[Collection]:
    """
    Lista todas las colecciones pertenecientes a un usuario.
    """
    return db.query(Collection).filter(Collection.user_id == user_id).all()


def get_collection_by_id(db: Session, collection_id: str) -> Optional[Collection]:
    """
    Obtiene una colección por su identificador.
    """
    return db.query(Collection).filter(Collection.id == collection_id).first()


# ---------------------------------------------------------
# OPERACIONES DE BASE DE DATOS: USER CARDS (INVENTARIO FÍSICO)
# ---------------------------------------------------------
def add_card_to_collection(
    db: Session, 
    collection_id: str, 
    payload: AddCardToCollectionPayload
) -> UserCard:
    """
    Inserta una copia física de una carta dentro de un binder.
    """
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


def get_cards_in_collection(db: Session, collection_id: str) -> List[UserCard]:
    """
    Lista las cartas físicas de un binder con su relación al catálogo Scryfall precargada.
    """
    return (
        db.query(UserCard)
        .options(joinedload(UserCard.card_catalog))
        .filter(UserCard.collection_id == collection_id)
        .all()
    )


def get_trade_market_cards(db: Session) -> List[UserCard]:
    """
    Obtiene todas las cartas marcadas con is_for_trade = True en la plataforma.
    """
    return (
        db.query(UserCard)
        .filter(UserCard.is_for_trade == True)
        .all()
    )
