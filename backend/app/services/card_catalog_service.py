# app/services/card_catalog_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: CATÁLOGO DINÁMICO MTG Y BÚSQUEDA
# ---------------------------------------------------------
import re
import time
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from fastapi import HTTPException, status

from app.models.card import CartaScryfall
from app.repositories.card_repository import CardRepository, escape_like
from app.services.scryfall_query_parser import parse_scryfall_query
from app.services.scryfall_service import ScryfallService
from app.schemas.card import SimilarCardsResponse

logger = logging.getLogger("card_catalog_service")


class DynamicVocabularyCache:
    """Caché en memoria con TTL para vocabularios y metadatos dinámicos."""
    _cache: Dict[str, Any] = {}
    _timestamps: Dict[str, float] = {}
    DEFAULT_TTL_SECONDS: int = 3600 * 12

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        if key in cls._cache:
            if time.time() - cls._timestamps.get(key, 0) < cls.DEFAULT_TTL_SECONDS:
                return cls._cache[key]
            cls.invalidate(key)
        return None

    @classmethod
    def set(cls, key: str, value: Any) -> None:
        cls._cache[key] = value
        cls._timestamps[key] = time.time()

    @classmethod
    def invalidate(cls, key: Optional[str] = None) -> None:
        if key:
            cls._cache.pop(key, None)
            cls._timestamps.pop(key, None)
        else:
            cls._cache.clear()
            cls._timestamps.clear()


class DynamicVocabularyProvider:
    """Proveedor de vocabulario MTG dinámico extraído directamente del catálogo."""

    @classmethod
    def get_all_keywords(cls, db: Session) -> List[str]:
        return [
            "Deathtouch", "Defender", "Double strike", "Enchant", "Equip",
            "First strike", "Flash", "Flying", "Haste", "Hexproof",
            "Indestructible", "Lifelink", "Menace", "Reach", "Trample", "Vigilance"
        ]

    @classmethod
    def get_all_card_types(cls, db: Session) -> List[str]:
        cache_key: str = "mtg_card_types"
        cached: Optional[List[str]] = DynamicVocabularyCache.get(cache_key)
        if cached is not None:
            return cached

        sql = text("""
            SELECT DISTINCT unnest(string_to_array(type_line, ' ')) AS type_token
            FROM cartas
            WHERE type_line IS NOT NULL
            ORDER BY type_token ASC
        """)
        try:
            results = db.execute(sql).fetchall()
            tokens: List[str] = [
                row[0].strip() for row in results 
                if row[0] and row[0].strip() not in ("—", "//")
            ]
            DynamicVocabularyCache.set(cache_key, tokens)
            return tokens
        except Exception as exc:
            logger.warning(f"No se pudieron extraer tipos de carta dinámicos: {exc}")
            return ["Creature", "Instant", "Sorcery", "Enchantment", "Artifact", "Land", "Planeswalker"]


class CardCatalogService:
    """
    Servicio de Dominio encargado de la búsqueda reactiva, autocompletado
    y recuperación de cartas del catálogo.
    """

    @classmethod
    def search_cards(
        cls,
        db: Session,
        q: Optional[str] = None,
        order: Optional[str] = None,
        card_type: Optional[str] = None,
        colors: Optional[str] = None,
        rarity: Optional[str] = None,
        cmc: Optional[float] = None,
        limit: int = 30
    ) -> List[CartaScryfall]:
        conditions = []
        active_order = order.lower() if order else None
        search_term: Optional[str] = None

        # 1. Extraer 'order:' si viene embebido en el texto de búsqueda Scryfall
        if q and q.strip():
            raw_q = q.strip()
            order_match = re.search(r'(?:order|sort):([a-zA-Z0-9_-]+)', raw_q, re.IGNORECASE)
            if order_match:
                if not active_order:
                    active_order = order_match.group(1).lower()
                raw_q = re.sub(r'(?:order|sort):([a-zA-Z0-9_-]+)', '', raw_q).strip()

            search_term = raw_q if raw_q else None

        has_filters = bool(search_term or (card_type and card_type.lower() != "all") or colors or rarity or (cmc is not None))

        # Si no hay texto ni filtros y tampoco se solicitó orden explícito, retornar vacío
        if not has_filters and not active_order:
            return []

        # 2. Ingesta bajo demanda: Si se busca un nombre de carta específico, asegurar que existan sus variantes
        is_direct_name_query = bool(search_term and not any([card_type, colors, rarity, cmc is not None]) and not (":" in search_term))
        if is_direct_name_query:
            count_local = db.query(CartaScryfall).filter(CartaScryfall.name.ilike(f"%{escape_like(search_term)}%", escape="\\")).count()
            # Si hay menos de 5 versiones de una carta con tantas ediciones como Sol Ring, sincronizar versiones completas
            if count_local < 5:
                logger.info(f"Pocas variantes en BD local ({count_local}) para '{search_term}'. Sincronizando desde Scryfall...")
                ScryfallService.fetch_and_store_by_name(db, search_term)

        # 3. Construcción de filtros SQLAlchemy
        if search_term:
            try:
                parsed_conditions = parse_scryfall_query(search_term)
                if parsed_conditions:
                    conditions.extend(parsed_conditions)
                else:
                    safe_q: str = escape_like(search_term)
                    conditions.append(CartaScryfall.name.ilike(f"%{safe_q}%", escape="\\"))
            except Exception as exc:
                logger.warning(f"Error parseando query Scryfall '{search_term}': {exc}. Usando fallback ilike.")
                safe_q = escape_like(search_term)
                conditions.append(CartaScryfall.name.ilike(f"%{safe_q}%", escape="\\"))

        # Filtro por tipo de carta
        if card_type and card_type.lower() != "all":
            safe_type: str = escape_like(card_type.strip())
            conditions.append(CartaScryfall.type_line.ilike(f"%{safe_type}%", escape="\\"))

        # Filtro por colores
        if colors:
            c_upper: str = colors.strip().upper()
            if c_upper == "C":
                conditions.append(CartaScryfall.colors == "C")
            elif c_upper in ("M", "MULTI", "MULTICOLOR"):
                conditions.append(CartaScryfall.colors.like("%,%"))
            else:
                color_filters = [
                    CartaScryfall.colors.ilike(f"%{c}%", escape="\\")
                    for c in c_upper if c in "WUBRG"
                ]
                if color_filters:
                    conditions.append(and_(*color_filters))

        # Filtro por rareza
        if rarity:
            safe_rarity: str = escape_like(rarity.strip().lower())
            conditions.append(CartaScryfall.rarity.ilike(safe_rarity, escape="\\"))

        # Coste de maná convertido (CMC)
        if cmc is not None:
            conditions.append(CartaScryfall.cmc == cmc)

        query = db.query(CartaScryfall)
        if conditions:
            query = query.filter(and_(*conditions))

        # 4. Ordenamiento
        if active_order == "cmc":
            query = query.order_by(CartaScryfall.cmc.asc(), CartaScryfall.name.asc())
        elif active_order == "rarity":
            query = query.order_by(CartaScryfall.rarity.asc(), CartaScryfall.name.asc())
        else:
            query = query.order_by(CartaScryfall.name.asc(), CartaScryfall.set.asc())

        results: List[CartaScryfall] = query.limit(limit).all()

        # 5. Contingencia final si tras la consulta sigue vacía
        if not results and search_term and len(search_term) >= 2:
            scryfall_prints = ScryfallService.fetch_and_store_by_name(db, search_term)
            if scryfall_prints:
                results = query.limit(limit).all()
                if not results:
                    results = scryfall_prints[:limit]

        return results

    @classmethod
    def autocomplete(
        cls,
        db: Session,
        q: str,
        field: str = "name",
        limit: int = 8
    ) -> List[str]:
        q_clean: str = q.strip().lower()
        if not q_clean:
            return []

        if field == "keyword":
            all_keywords: List[str] = DynamicVocabularyProvider.get_all_keywords(db)
            return [kw for kw in all_keywords if q_clean in kw.lower()][:limit]

        if field == "type":
            all_types: List[str] = DynamicVocabularyProvider.get_all_card_types(db)
            return [t for t in all_types if q_clean in t.lower()][:limit]

        if field == "name":
            if len(q_clean) < 2:
                return []
            safe_q: str = escape_like(q_clean)
            results = (
                db.query(CartaScryfall.name)
                .filter(CartaScryfall.name.ilike(f"%{safe_q}%", escape="\\"))
                .distinct()
                .order_by(CartaScryfall.name.asc())
                .limit(limit)
                .all()
            )
            return [r[0] for r in results]

        if field == "oracle":
            if len(q_clean) < 3:
                return []
            safe_q_oracle: str = escape_like(q_clean)
            results_oracle = (
                db.query(CartaScryfall.name)
                .filter(CartaScryfall.oracle_text.ilike(f"%{safe_q_oracle}%", escape="\\"))
                .distinct()
                .order_by(CartaScryfall.name.asc())
                .limit(limit)
                .all()
            )
            return [r[0] for r in results_oracle]

        return []

    @classmethod
    def get_card_by_id_or_fail(cls, db: Session, card_id: str) -> CartaScryfall:
        carta: Optional[CartaScryfall] = CardRepository.get_by_id(db, card_id=card_id)
        if not carta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La carta con ID '{card_id}' no fue encontrada en el catálogo."
            )
        return carta

    @classmethod
    def get_similar_cards_or_fail(
        cls,
        db: Session,
        card_id: str,
        limit: int = 6
    ) -> SimilarCardsResponse:
        resultado: Optional[SimilarCardsResponse] = CardRepository.get_similar_cards(db, card_id=card_id, limit=limit)
        if not resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La carta con ID '{card_id}' no fue encontrada para buscar similares."
            )
        return resultado

    @classmethod
    def notify_catalog_updated(cls) -> None:
        DynamicVocabularyCache.invalidate()