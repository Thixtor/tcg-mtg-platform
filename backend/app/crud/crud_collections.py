from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.collection import Collection, UserCard
from app.schemas.collection import CollectionCreate, AddCardToCollectionPayload


def count_user_collections(db: Session, user_id: str) -> int:
    return db.query(Collection).filter(Collection.user_id == user_id).count()


def create_collection(db: Session, user_id: str, payload: CollectionCreate) -> Collection:
    nueva_coleccion = Collection(
        user_id=user_id,
        name=payload.name,
        description=payload.description,
        is_public_trade=getattr(payload, 'is_public_trade', True)
    )
    db.add(nueva_coleccion)
    db.commit()
    db.refresh(nueva_coleccion)
    return nueva_coleccion


def get_collections_by_user(db: Session, user_id: str, only_public: bool = False) -> List[Collection]:
    query = db.query(Collection).filter(Collection.user_id == user_id)
    if only_public:
        query = query.filter(Collection.is_public_trade.is_(True))
    return query.all()


def get_collection_by_id(db: Session, collection_id: str) -> Optional[Collection]:
    return db.query(Collection).filter(Collection.id == collection_id).first()


def get_user_collection(db: Session, collection_id: str, user_id: str) -> Optional[Collection]:
    return db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()


def add_card_to_collection(
    db: Session, 
    collection_id: str, 
    payload: AddCardToCollectionPayload
) -> UserCard:
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
    return (
        db.query(UserCard)
        .options(joinedload(UserCard.card_catalog))
        .filter(UserCard.collection_id == collection_id)
        .all()
    )


def get_user_card(db: Session, collection_id: str, card_id: str) -> Optional[UserCard]:
    return (
        db.query(UserCard)
        .filter(UserCard.id == card_id, UserCard.collection_id == collection_id)
        .first()
    )


def remove_card_from_collection(db: Session, card: UserCard) -> None:
    db.delete(card)
    db.commit()