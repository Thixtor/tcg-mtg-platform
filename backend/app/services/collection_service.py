# app/services/collection_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: COLECCIONES, BINDERS E INVENTARIO
# ---------------------------------------------------------
import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import or_
from fastapi import HTTPException, status

from app.models.collection import Collection, UserCard
from app.models.card import CartaScryfall
from app.schemas import CollectionCreate, AddCardToCollectionPayload


def _extract_prices_from_catalog(card_catalog: Optional[CartaScryfall], is_foil: bool) -> Dict[str, float]:
    """
    Extrae de forma segura los precios unitarios (TCGplayer y Card Kingdom)
    revisando tanto columnas del modelo como estructuras JSON.
    """
    if not card_catalog:
        return {"tcg": 0.0, "ck": 0.0}

    prices_dict = {}
    
    # 1. Intentar leer atributo prices
    raw_prices = getattr(card_catalog, "prices", None)
    if isinstance(raw_prices, dict):
        prices_dict = raw_prices
    elif isinstance(raw_prices, str):
        try:
            prices_dict = json.loads(raw_prices)
        except Exception:
            prices_dict = {}

    # 2. Si no hay prices, revisar scryfall_raw_data si existe
    if not prices_dict and hasattr(card_catalog, "scryfall_raw_data"):
        raw_data = getattr(card_catalog, "scryfall_raw_data", None)
        if isinstance(raw_data, dict):
            prices_dict = raw_data.get("prices") or {}
        elif isinstance(raw_data, str):
            try:
                parsed_data = json.loads(raw_data)
                prices_dict = parsed_data.get("prices") or {}
            except Exception:
                pass

    def _to_float(v) -> float:
        if v is None:
            return 0.0
        try:
            cleaned = str(v).replace("$", "").replace("€", "").strip()
            val = float(cleaned)
            return 0.0 if val < 0 else val
        except (ValueError, TypeError):
            return 0.0

    # TCGplayer Market
    tcg_val = 0.0
    if is_foil:
        tcg_val = _to_float(prices_dict.get("usd_foil")) or _to_float(prices_dict.get("usd"))
    else:
        tcg_val = _to_float(prices_dict.get("usd")) or _to_float(prices_dict.get("usd_foil"))

    # Fallback a columnas directas del modelo si existieran
    if tcg_val == 0.0:
        tcg_val = _to_float(getattr(card_catalog, "price_usd", None))

    # Card Kingdom
    ck_val = 0.0
    if is_foil:
        ck_val = (
            _to_float(prices_dict.get("cardkingdom_foil")) 
            or _to_float(prices_dict.get("ck_foil"))
            or tcg_val
        )
    else:
        ck_val = (
            _to_float(prices_dict.get("cardkingdom")) 
            or _to_float(prices_dict.get("ck"))
            or tcg_val
        )

    return {"tcg": tcg_val, "ck": ck_val}


class CollectionService:
    """
    Servicio de Dominio para orquestar carpetas físicas/binders y ejemplares de usuario.
    Maneja cuotas máximas, control de privacidad, persistencia atómica y cálculo de valores.
    """

    MAX_COLLECTIONS_PER_USER: int = 10

    @classmethod
    def get_user_collections(cls, db: Session, user_id: str, only_public: bool = False) -> List[Collection]:
        query = db.query(Collection).filter(Collection.user_id == user_id)
        if only_public:
            query = query.filter(Collection.is_public_trade.is_(True))

        collections = query.all()

        # Calcular métricas para cada colección
        for col in collections:
            user_cards = (
                db.query(UserCard)
                .filter(UserCard.collection_id == col.id)
                .options(joinedload(UserCard.card_catalog))
                .all()
            )

            total_cards = 0
            val_tcg = 0.0
            val_ck = 0.0
            previews = []

            for uc in user_cards:
                qty = uc.quantity or 1
                total_cards += qty

                prices = _extract_prices_from_catalog(uc.card_catalog, uc.is_foil)
                val_tcg += prices["tcg"] * qty
                val_ck += prices["ck"] * qty

                # Previsualización de arte (hasta 5)
                if len(previews) < 5 and uc.card_catalog:
                    art = (
                        getattr(uc.card_catalog, "image_url", None)
                        or (uc.card_catalog.image_uris.get("art_crop") if isinstance(getattr(uc.card_catalog, "image_uris", None), dict) else None)
                    )
                    if art and art not in previews:
                        previews.append(art)

            col.card_count = total_cards
            col.total_value = round(val_tcg, 2)
            col.total_value_tcg = round(val_tcg, 2)
            col.total_value_ck = round(val_ck, 2)
            col.preview_cards = previews

        return collections

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

        new_collection.card_count = 0
        new_collection.total_value = 0.0
        new_collection.total_value_tcg = 0.0
        new_collection.total_value_ck = 0.0
        new_collection.preview_cards = []

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

            # Inyectar precios unitarios
            prices = _extract_prices_from_catalog(card_catalog, user_card.is_foil)
            user_card.price_usd = prices["tcg"]
            user_card.price_tcg = prices["tcg"]
            user_card.price_ck = prices["ck"]
            user_card.card_catalog = card_catalog

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
            .options(joinedload(UserCard.card_catalog))
        )

        if hasattr(UserCard, "created_at"):
            query = query.order_by(getattr(UserCard, "created_at").desc())
        else:
            query = query.order_by(UserCard.id.desc())

        cards = query.offset(offset).limit(page_size).all()

        # Inyectar precios calculados en cada UserCard
        for uc in cards:
            prices = _extract_prices_from_catalog(uc.card_catalog, uc.is_foil)
            uc.price_usd = prices["tcg"]
            uc.price_tcg = prices["tcg"]
            uc.price_ck = prices["ck"]

        return cards

    @classmethod
    def search_user_cards(
        cls,
        db: Session,
        user_id: str,
        query_text: Optional[str] = None,
        color_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        only_for_trade: Optional[bool] = None,
        is_foil: Optional[bool] = None,
        condition: Optional[str] = None,
        collection_id: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        base_query = (
            db.query(
                UserCard.id.label("id"),
                UserCard.collection_id.label("collection_id"),
                Collection.name.label("collection_name"),
                UserCard.quantity.label("quantity"),
                UserCard.condition.label("condition"),
                UserCard.language.label("language"),
                UserCard.is_foil.label("is_foil"),
                UserCard.is_for_trade.label("is_for_trade"),
                UserCard.trade_notes.label("trade_notes"),
                UserCard.scryfall_card_id.label("scryfall_card_id"),
                CartaScryfall.name.label("card_name"),
                CartaScryfall.type_line.label("type_line"),
                CartaScryfall.color_identity.label("color_identity"),
                CartaScryfall.cmc.label("cmc"),
            )
            .join(Collection, UserCard.collection_id == Collection.id)
            .join(CartaScryfall, UserCard.scryfall_card_id == CartaScryfall.id)
            .filter(Collection.user_id == user_id)
        )

        if collection_id:
            base_query = base_query.filter(UserCard.collection_id == collection_id)

        if query_text:
            cleaned = f"%{query_text.strip()}%"
            base_query = base_query.filter(
                or_(
                    CartaScryfall.name.ilike(cleaned),
                    CartaScryfall.type_line.ilike(cleaned)
                )
            )

        if color_filter:
            colors = [c.strip().upper() for c in color_filter.split(",") if c.strip()]
            for color in colors:
                base_query = base_query.filter(CartaScryfall.color_identity.ilike(f"%{color}%"))

        if type_filter:
            base_query = base_query.filter(CartaScryfall.type_line.ilike(f"%{type_filter.strip()}%"))

        if only_for_trade is not None:
            base_query = base_query.filter(UserCard.is_for_trade == only_for_trade)

        if is_foil is not None:
            base_query = base_query.filter(UserCard.is_foil == is_foil)

        if condition:
            base_query = base_query.filter(UserCard.condition == condition.upper())

        total_items = base_query.count()
        offset = max(0, (page - 1) * limit)
        results = (
            base_query
            .order_by(CartaScryfall.name.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "total": total_items,
            "page": page,
            "limit": limit,
            "items": results
        }