from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, defer
from fastapi import HTTPException, status

from app.models.collection import Collection, UserCard
from app.models.card import CartaScryfall
from app.schemas import CollectionCreate, AddCardToCollectionPayload


class CollectionService:
    """
    Servicio de Dominio para orquestar carpetas físicas/binders y ejemplares de usuario.
    Maneja cuotas máximas, control de privacidad y persistencia atómica.
    """

    MAX_COLLECTIONS_PER_USER: int = 10

    @classmethod
    def get_user_collections(cls, db: Session, user_id: str, only_public: bool = False) -> List[Collection]:
        query = db.query(Collection).filter(Collection.user_id == user_id)
        if only_public:
            query = query.filter(Collection.is_public_trade.is_(True))
        return query.all()

    @classmethod
    def get_collection_or_fail(cls, db: Session, collection_id: str, user_id: Optional[str] = None) -> Collection:
        query = db.query(Collection).filter(Collection.id == collection_id)
        if user_id is not None:
            query = query.filter(Collection.user_id == user_id)

        collection = query.first()
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Colección no encontrada o no autorizada."
            )
        return collection

    @classmethod
    def create_collection(cls, db: Session, user_id: str, payload: CollectionCreate) -> Collection:
        current_count = db.query(Collection).filter(Collection.user_id == user_id).count()
        if current_count >= cls.MAX_COLLECTIONS_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Has alcanzado el límite máximo permitido de {cls.MAX_COLLECTIONS_PER_USER} colecciones/binders."
            )

        new_collection = Collection(
            user_id=user_id,
            name=payload.name,
            description=getattr(payload, "description", None),
            is_public_trade=getattr(payload, "is_public_trade", True),
            art_url=getattr(payload, "art_url", None)
        )
        db.add(new_collection)
        db.commit()
        db.refresh(new_collection)
        return new_collection

    @classmethod
    def add_card_to_collection(
        cls,
        db: Session,
        collection_id: str,
        user_id: str,
        payload: AddCardToCollectionPayload
    ) -> UserCard:
        collection = cls.get_collection_or_fail(db, collection_id=collection_id, user_id=user_id)

        card_catalog = db.query(CartaScryfall).filter(CartaScryfall.id == payload.scryfall_card_id).first()
        if not card_catalog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La carta '{payload.scryfall_card_id}' no existe en el catálogo Scryfall."
            )

        try:
            user_card = collection.add_card(
                scryfall_card_id=payload.scryfall_card_id,
                quantity=getattr(payload, "quantity", 1),
                condition=getattr(payload, "condition", "NM"),
                language=getattr(payload, "language", "en"),
                is_foil=getattr(payload, "is_foil", False),
                is_for_trade=getattr(payload, "is_for_trade", False),
                trade_notes=getattr(payload, "trade_notes", None)
            )
            db.commit()
            db.refresh(user_card)
            return user_card
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def remove_card_from_collection(cls, db: Session, collection_id: str, user_id: str, card_id: str) -> None:
        collection = cls.get_collection_or_fail(db, collection_id=collection_id, user_id=user_id)
        try:
            collection.remove_card(card_id)
            db.commit()
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))

    @classmethod
    def get_paginated_cards(
        cls,
        db: Session,
        collection_id: str,
        current_user_id: Optional[str],
        page: int = 1,
        page_size: int = 50
    ) -> List[UserCard]:
        collection = cls.get_collection_or_fail(db, collection_id=collection_id)

        # Regla de privacidad anti-enumeración
        is_owner = current_user_id is not None and str(collection.user_id) == str(current_user_id)
        if not collection.is_public_trade and not is_owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Colección no encontrada."
            )

        offset = (page - 1) * page_size
        query = (
            db.query(UserCard)
            .filter(UserCard.collection_id == collection_id)
            .options(joinedload(UserCard.card_catalog).defer(CartaScryfall.scryfall_raw_data))
        )

        if hasattr(UserCard, "created_at"):
            query = query.order_by(getattr(UserCard, "created_at").desc())
        else:
            query = query.order_by(UserCard.id.desc())

        return query.offset(offset).limit(page_size).all()