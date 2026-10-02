# app/models/__init__.py
# ---------------------------------------------------------
# EXPORTACIÓN CENTRALIZADA DE MODELOS ORM
# ---------------------------------------------------------
from app.database import Base
from app.models.card import CartaScryfall
from app.models.user import User
from app.models.collection import Collection, UserCard
from app.models.deck import Deck, DeckCard
from app.models.wishlist import WishlistItem
from app.models.price import HistoricoPrecio
from app.models.trade_proposal import TradeProposal, TradeProposalItem

__all__ = [
    "Base",
    "CartaScryfall",
    "User",
    "Collection",
    "UserCard",
    "Deck",
    "DeckCard",
    "WishlistItem",
    "HistoricoPrecio",
    "TradeProposal",
    "TradeProposalItem",
]