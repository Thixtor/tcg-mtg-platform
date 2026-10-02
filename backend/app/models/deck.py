# app/models/deck.py
# -----------------------------------------------------------------------------
# MODELOS Y AGREGADO RAÍZ: MAZOS Y REGLAS DE FORMATO (MTG)
# -----------------------------------------------------------------------------
import uuid
import re
from typing import List, Optional, Set, Dict, Any, Union
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, object_session
from app.database import Base


# -----------------------------------------------------------------------------
# ADAPTADOR SEMÁNTICO DE DOMINIO PARA CARTAS MTG (POO)
# -----------------------------------------------------------------------------
class MTGCardDomainAdapter:
    """
    Encapsula el análisis sintáctico y semántico de una carta de MTG
    independientemente de cómo evolucione el catálogo o los tipos de cartas.
    """
    def __init__(self, card_catalog: Any) -> None:
        self._card = card_catalog

    @property
    def name(self) -> str:
        return getattr(self._card, "name", "") or ""

    @property
    def type_line(self) -> str:
        return getattr(self._card, "type_line", "") or ""

    @property
    def oracle_text(self) -> str:
        return getattr(self._card, "oracle_text", "") or ""

    @property
    def cmc(self) -> float:
        try:
            return float(getattr(self._card, "cmc", 0.0) or 0.0)
        except (ValueError, TypeError):
            return 0.0

    @property
    def is_land(self) -> bool:
        return "land" in self.type_line.lower()

    @property
    def is_basic(self) -> bool:
        main_type_part = self.type_line.split("—")[0].strip().lower()
        tokens = set(main_type_part.split())
        return "basic" in tokens

    @property
    def max_allowed_in_deck(self) -> Optional[Union[int, float]]:
        text = self.oracle_text.lower()
        if "a deck can have any number of cards named" in text:
            return float("inf")
        
        match = re.search(r"a deck can have up to (\w+) cards named", text)
        if match:
            num_word = match.group(1)
            number_map = {
                "one": 1, "two": 2, "three": 3, "four": 4, 
                "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9
            }
            return number_map.get(num_word, 4)

        return None

    @property
    def color_identity(self) -> Set[str]:
        raw = getattr(self._card, "color_identity", "")
        if isinstance(raw, list):
            return set(raw)
        if isinstance(raw, str):
            return {c.strip().upper() for c in raw.split(",") if c.strip()}
        return set()


# -----------------------------------------------------------------------------
# PATRÓN ESTRATEGIA: VALIDACIÓN DINÁMICA DE FORMATOS (MTG)
# -----------------------------------------------------------------------------
class DeckLegalityStrategy:
    def validate(self, deck: 'Deck') -> List[str]:
        raise NotImplementedError


class CommanderLegalityStrategy(DeckLegalityStrategy):
    def validate(self, deck: 'Deck') -> List[str]:
        issues: List[str] = []

        if not deck.commander_cards:
            issues.append("El mazo de Commander debe contener al menos un comandante designado.")

        if deck.total_cards_count != 100:
            issues.append(
                f"Un mazo de Commander debe tener exactamente 100 cartas (Comandante + 99). Cantidad actual: {deck.total_cards_count}."
            )

        cmd_identity = deck.get_commander_color_identity()

        for deck_card in deck.cards:
            if deck_card.category not in {"commander", "mainboard"}:
                continue

            card = deck_card.adapter
            if not card:
                continue

            custom_limit = card.max_allowed_in_deck
            if not card.is_basic:
                if custom_limit is not None:
                    if deck_card.quantity > custom_limit:
                        issues.append(
                            f"La carta '{card.name}' excede el límite permitido por su habilidad ({custom_limit} copias)."
                        )
                elif deck_card.quantity > 1:
                    issues.append(
                        f"Regla Singleton violada: '{card.name}' tiene {deck_card.quantity} copias registradas."
                    )

            if deck.commander_cards and not card.color_identity.issubset(cmd_identity):
                diff = card.color_identity - cmd_identity
                issues.append(
                    f"'{card.name}' contiene colores fuera de la identidad del comandante: {diff}."
                )

        return issues


class StandardOrModernLegalityStrategy(DeckLegalityStrategy):
    def validate(self, deck: 'Deck') -> List[str]:
        issues: List[str] = []
        if deck.total_cards_count < 60:
            issues.append(f"El mazo debe contener al menos 60 cartas. Cantidad actual: {deck.total_cards_count}.")

        for deck_card in deck.cards:
            if deck_card.category not in {"mainboard"}:
                continue

            card = deck_card.adapter
            if not card:
                continue

            custom_limit = card.max_allowed_in_deck
            limit = custom_limit if custom_limit is not None else 4

            if not card.is_basic and deck_card.quantity > limit:
                issues.append(f"'{card.name}' excede el máximo permitido de {limit} copias.")

        return issues


class LegalityStrategyFactory:
    _strategies: Dict[str, DeckLegalityStrategy] = {
        "commander": CommanderLegalityStrategy(),
        "standard": StandardOrModernLegalityStrategy(),
        "modern": StandardOrModernLegalityStrategy(),
        "pioneer": StandardOrModernLegalityStrategy(),
    }

    @classmethod
    def get_strategy(cls, format_name: str) -> DeckLegalityStrategy:
        return cls._strategies.get(format_name.lower(), CommanderLegalityStrategy())


# -----------------------------------------------------------------------------
# MODELOS DE DOMINIO / PERSISTENCIA (SQLALCHEMY)
# -----------------------------------------------------------------------------
class DeckCard(Base):
    __tablename__ = 'deck_cards'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deck_id = Column(String, ForeignKey('decks.id', ondelete='CASCADE'), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id', ondelete='CASCADE'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    category = Column(String, default="mainboard", nullable=False)

    deck = relationship("Deck", back_populates="cards")
    card_catalog = relationship("CartaScryfall", lazy="select")

    __table_args__ = (
        UniqueConstraint('deck_id', 'scryfall_card_id', 'category', name='uq_deck_card_category'),
    )

    @property
    def card_id(self) -> str:
        return self.scryfall_card_id

    @property
    def adapter(self) -> Optional[MTGCardDomainAdapter]:
        if self.card_catalog:
            return MTGCardDomainAdapter(self.card_catalog)

        session = object_session(self)
        if session and self.scryfall_card_id:
            from app.models.card import CartaScryfall
            card = session.query(CartaScryfall).filter(CartaScryfall.id == self.scryfall_card_id).first()
            if card:
                self.card_catalog = card
                return MTGCardDomainAdapter(card)

        return None

    def change_quantity(self, new_quantity: int) -> None:
        if new_quantity <= 0:
            raise ValueError("La cantidad de cartas debe ser mayor a 0.")
        self.quantity = new_quantity

    def change_category(self, new_category: str) -> None:
        valid_categories = {"commander", "mainboard", "sideboard", "maybeboard"}
        if new_category not in valid_categories:
            raise ValueError(f"Categoría inválida: {new_category}. Opciones: {valid_categories}")
        self.category = new_category


class Deck(Base):
    """
    Agregado Raíz: Mazo de MTG.
    Gestiona la coherencia de formato, número de copias y reglas de legalidad.
    """
    __tablename__ = 'decks'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String, nullable=False)
    format = Column(String, default="Commander", nullable=False)
    description = Column(String, nullable=True)
    featured_card_id = Column(
        String, 
        ForeignKey('cartas.id', ondelete='SET NULL'), 
        nullable=True
    )

    owner = relationship("User", back_populates="decks")
    cards = relationship(
        "DeckCard",
        back_populates="deck",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # -------------------------------------------------------------------------
    # Operaciones del Agregado
    # -------------------------------------------------------------------------
    def find_card(self, scryfall_card_id: str, category: str = "mainboard") -> Optional[DeckCard]:
        for card in self.cards:
            target_id = getattr(card, "scryfall_card_id", None) or getattr(card, "card_id", None)
            if target_id == scryfall_card_id and card.category == category:
                return card
        return None

    def add_card(
        self, 
        scryfall_card_id: Optional[str] = None, 
        quantity: int = 1, 
        category: str = "mainboard",
        card_catalog: Optional[Any] = None,
        **kwargs
    ) -> DeckCard:
        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a cero.")

        resolved_card_id = scryfall_card_id or kwargs.get("card_id")
        if not resolved_card_id:
            raise ValueError("Se requiere scryfall_card_id para añadir la carta.")

        existing = self.find_card(scryfall_card_id=resolved_card_id, category=category)
        if existing:
            existing.quantity += quantity
            if card_catalog and not existing.card_catalog:
                existing.card_catalog = card_catalog
            return existing

        deck_card = DeckCard(
            id=str(uuid.uuid4()),
            deck_id=self.id,
            scryfall_card_id=resolved_card_id,
            quantity=quantity,
            category=category
        )
        if card_catalog:
            deck_card.card_catalog = card_catalog

        self.cards.append(deck_card)
        return deck_card

    def remove_card(self, card_id: str) -> None:
        target = next((c for c in self.cards if c.id == card_id), None)
        if not target:
            raise ValueError("La carta especificada no existe en el mazo.")
        self.cards.remove(target)

    def set_featured_card(self, scryfall_card_id: Optional[str]) -> None:
        self.featured_card_id = scryfall_card_id

    # -------------------------------------------------------------------------
    # Comportamiento MTG y Métricas
    # -------------------------------------------------------------------------
    @property
    def total_cards_count(self) -> int:
        return sum(card.quantity for card in self.cards if card.category in {"commander", "mainboard"})

    @property
    def commander_cards(self) -> List[DeckCard]:
        return [card for card in self.cards if card.category == "commander"]

    def calculate_average_cmc(self) -> float:
        total_cmc: float = 0.0
        total_non_lands: int = 0

        for deck_card in self.cards:
            if deck_card.category not in {"commander", "mainboard"}:
                continue

            adapter = deck_card.adapter
            if not adapter or adapter.is_land:
                continue

            total_cmc += adapter.cmc * deck_card.quantity
            total_non_lands += deck_card.quantity

        return round(total_cmc / total_non_lands, 2) if total_non_lands > 0 else 0.0

    def get_commander_color_identity(self) -> Set[str]:
        identity: Set[str] = set()
        for cmd in self.commander_cards:
            adapter = cmd.adapter
            if adapter:
                identity.update(adapter.color_identity)
        return identity

    def validate_legality(self) -> Dict[str, Any]:
        strategy = LegalityStrategyFactory.get_strategy(self.format)
        issues = strategy.validate(self)

        return {
            "is_legal": len(issues) == 0,
            "issues": issues,
            "format": self.format,
            "total_cards": self.total_cards_count,
            "average_cmc": self.calculate_average_cmc()
        }

    def fork(self, new_user_id: str, new_name: Optional[str] = None) -> 'Deck':
        forked_deck = Deck(
            id=str(uuid.uuid4()),
            user_id=new_user_id,
            name=new_name or f"Copia de {self.name}",
            format=self.format,
            description=self.description,
            featured_card_id=self.featured_card_id
        )
        for original_card in self.cards:
            resolved_card_id = (
                getattr(original_card, "scryfall_card_id", None) 
                or getattr(original_card, "card_id", None)
            )
            if resolved_card_id:
                forked_deck.add_card(
                    scryfall_card_id=resolved_card_id,
                    quantity=original_card.quantity,
                    category=original_card.category,
                    card_catalog=getattr(original_card, "card_catalog", None)
                )
        return forked_deck