# app/services/card_catalog_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: CATÁLOGO DINÁMICO MTG Y BÚSQUEDA
# ---------------------------------------------------------
import time
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, defer
from sqlalchemy import and_, text
from fastapi import HTTPException, status

from app.models.card import CartaScryfall
from app.repositories.card_repository import CardRepository, escape_like
from app.services.scryfall_query_parser import parse_scryfall_query
from app.schemas.card import SimilarCardsResponse


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
        cache_key: str = "mtg_keywords"
        cached: Optional[List[str]] = DynamicVocabularyCache.get(cache_key)
        if cached is not None:
            return cached

        sql = text("""
            SELECT DISTINCT jsonb_array_elements_text(scryfall_raw_data->'keywords') AS keyword
            FROM cartas
            WHERE scryfall_raw_data->'keywords' IS NOT NULL
            ORDER BY keyword ASC
        """)
        try:
            results = db.execute(sql).fetchall()
            keywords: List[str] = [row[0] for row in results if row[0]]
            DynamicVocabularyCache.set(cache_key, keywords)
            return keywords
        except Exception:
            return []

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
        except Exception:
            return []


class CardCatalogService:
    """
    Servicio de Dominio encargado de la búsqueda reactiva, autocompletado
    y recuperación de cartas inmutables del catálogo Scryfall.
    """

    @classmethod
    def search_cards(
        cls,
        db: Session,
        q: Optional[str] = None,
        card_type: Optional[str] = None,
        colors: Optional[str] = None,
        rarity: Optional[str] = None,
        cmc: Optional[float] = None,
        limit: int = 24
    ) -> List[CartaScryfall]:
        query = db.query(CartaScryfall).options(defer(CartaScryfall.scryfall_raw_data))
        conditions = []

        # 1. Si no hay ningún criterio, retornar las cartas iniciales por defecto del catálogo
        has_criteria: bool = bool((q and q.strip()) or card_type or colors or rarity or (cmc is not None))
        if not has_criteria:
            return query.order_by(CartaScryfall.name.asc()).limit(limit).all()

        # 2. Parseo de sintaxis Scryfall o búsqueda por nombre directo
        if q and q.strip():
            raw_q: str = q.strip()
            parsed_conditions = parse_scryfall_query(raw_q)
            if parsed_conditions:
                conditions.extend(parsed_conditions)
            else:
                # Fallback: búsqueda por coincidencia parcial de nombre si el parser no extrae tokens
                safe_q: str = escape_like(raw_q)
                conditions.append(CartaScryfall.name.ilike(f"%{safe_q}%", escape="\\"))

        # 3. Filtro por tipo de carta
        if card_type and card_type.lower() != "all":
            safe_type: str = escape_like(card_type.strip())
            conditions.append(CartaScryfall.type_line.ilike(f"%{safe_type}%", escape="\\"))

        # 4. Filtro por colores
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

        # 5. Filtro por rareza
        if rarity:
            safe_rarity: str = escape_like(rarity.strip().lower())
            conditions.append(CartaScryfall.rarity.ilike(safe_rarity, escape="\\"))

        # 6. Coste de maná convertido (CMC)
        if cmc is not None:
            conditions.append(CartaScryfall.cmc == cmc)

        if conditions:
            query = query.filter(and_(*conditions))

        results: List[CartaScryfall] = query.order_by(CartaScryfall.name.asc()).limit(limit).all()
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

        if field == "artist":
            if len(q_clean) < 2:
                return []
            safe_q_artist: str = escape_like(q_clean)
            results_artist = (
                db.query(CartaScryfall.scryfall_raw_data["artist"].astext)
                .filter(CartaScryfall.scryfall_raw_data["artist"].astext.ilike(f"%{safe_q_artist}%", escape="\\"))
                .distinct()
                .limit(limit)
                .all()
            )
            return [r[0] for r in results_artist if r[0]]

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