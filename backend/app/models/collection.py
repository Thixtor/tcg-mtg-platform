# app/models/collection.py
# ---------------------------------------------------------
# ENTIDAD INTERNA: CARTA FÍSICA EN COLECCIÓN
# ---------------------------------------------------------
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class CardCondition(str, Enum):
    NM = "NM"  # Near Mint
    LP = "LP"  # Lightly Played
    MP = "MP"  # Moderately Played
    HP = "HP"  # Heavily Played
    DMG = "DMG"  # Damaged


class CardLanguage(str, Enum):
    EN = "en"
    ES = "es"
    JA = "ja"
    FR = "fr"
    DE = "de"
    IT = "it"
    PT = "pt"
    RU = "ru"
    KO = "ko"
    ZHS = "zhs"
    ZHT = "zht"


class UserCard(Base):
    """
    Instancia física de una carta MTG en posesión del usuario.
    Encapsula atributos de conservación física y estado de intercambio P2P.
    """
    __tablename__ = 'user_cards'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String, ForeignKey('collections.id', ondelete='CASCADE'), nullable=False, index=True)
    scryfall_card_id = Column(String, ForeignKey('cartas.id', ondelete='CASCADE'), nullable=False, index=True)

    quantity = Column(Integer, default=1, nullable=False)
    condition = Column(String, default=CardCondition.NM.value, nullable=False)
    language = Column(String, default=CardLanguage.EN.value, nullable=False)
    is_foil = Column(Boolean, default=False, nullable=False)

    # Flags para el muro de intercambio P2P / TradeWall
    is_for_trade = Column(Boolean, default=False, index=True, nullable=False)
    trade_notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    collection = relationship("Collection", back_populates="cards")
    card_catalog = relationship("CartaScryfall", back_populates="instances_in_collections", lazy="select")

    __table_args__ = (
        UniqueConstraint(
            'collection_id', 'scryfall_card_id', 'condition', 'language', 'is_foil',
            name='uq_collection_physical_card_instance'
        ),
    )

    def change_quantity(self, new_quantity: int) -> None:
        if new_quantity <= 0:
            raise ValueError("La cantidad de copias físicas debe ser mayor a cero.")
        self.quantity = new_quantity

    def set_condition(self, new_condition: str) -> None:
        valid_conditions = {c.value for c in CardCondition}
        if new_condition not in valid_conditions:
            raise ValueError(f"Condición inválida: {new_condition}. Opciones permitidas: {valid_conditions}")
        self.condition = new_condition

    def set_trade_status(self, is_for_trade: bool, trade_notes: Optional[str] = None) -> None:
        self.is_for_trade = is_for_trade
        if trade_notes is not None:
            self.trade_notes = trade_notes.strip() if trade_notes else None


# ---------------------------------------------------------
# AGREGADO RAÍZ: COLECCIÓN / BINDER FÍSICO
# ---------------------------------------------------------
class Collection(Base):
    """
    Agregado Raíz del inventario físico (Carpeta o Binder).
    Controla el acceso, adición, retiro y agrupación de ejemplares de cartas.
    """
    __tablename__ = 'collections'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    is_public_trade = Column(Boolean, default=True, nullable=False, index=True)
    art_url = Column(String, nullable=True)

    owner = relationship("User", back_populates="collections")
    cards = relationship(
        "UserCard",
        back_populates="collection",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def find_card_instance(
        self,
        scryfall_card_id: str,
        condition: str = "NM",
        language: str = "en",
        is_foil: bool = False
    ) -> Optional[UserCard]:
        for card in self.cards:
            if (
                card.scryfall_card_id == scryfall_card_id
                and card.condition == condition
                and card.language == language
                and card.is_foil == is_foil
            ):
                return card
        return None

    def add_card(
        self,
        scryfall_card_id: str,
        quantity: int = 1,
        condition: str = "NM",
        language: str = "en",
        is_foil: bool = False,
        is_for_trade: bool = False,
        trade_notes: Optional[str] = None
    ) -> UserCard:
        if quantity <= 0:
            raise ValueError("La cantidad física agregada debe ser superior a 0.")

        existing = self.find_card_instance(
            scryfall_card_id=scryfall_card_id,
            condition=condition,
            language=language,
            is_foil=is_foil
        )
        if existing:
            existing.quantity += quantity
            if is_for_trade:
                existing.is_for_trade = True
            if trade_notes:
                existing.trade_notes = trade_notes
            return existing

        new_instance = UserCard(
            id=str(uuid.uuid4()),
            collection_id=self.id,
            scryfall_card_id=scryfall_card_id,
            quantity=quantity,
            condition=condition,
            language=language,
            is_foil=is_foil,
            is_for_trade=is_for_trade,
            trade_notes=trade_notes
        )
        self.cards.append(new_instance)
        return new_instance

    def remove_card(self, user_card_id: str) -> None:
        target = next((c for c in self.cards if c.id == user_card_id), None)
        if not target:
            raise ValueError("La carta especificada no existe en esta colección.")
        self.cards.remove(target)

    def update_metadata(self, name: Optional[str] = None, description: Optional[str] = None, art_url: Optional[str] = None) -> None:
        if name is not None:
            clean_name = name.strip()
            if not clean_name:
                raise ValueError("El nombre de la colección no puede ser vacío.")
            self.name = clean_name
        if description is not None:
            self.description = description.strip() if description else None
        if art_url is not None:
            self.art_url = art_url.strip() if art_url else None

    def set_trade_visibility(self, is_public: bool) -> None:
        self.is_public_trade = is_public

    @property
    def total_cards_count(self) -> int:
        return sum(card.quantity for card in self.cards)

    @property
    def trade_cards_count(self) -> int:
        return sum(card.quantity for card in self.cards if card.is_for_trade)

    def get_summary(self) -> Dict[str, Any]:
        return {
            "collection_id": self.id,
            "name": self.name,
            "total_items": self.total_cards_count,
            "trade_items": self.trade_cards_count,
            "is_public_trade": self.is_public_trade
        }