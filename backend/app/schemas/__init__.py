# app/schemas/__init__.py
# ---------------------------------------------------------
# EXPORTACIÓN CENTRALIZADA DE ESQUEMAS PYDANTIC
# ---------------------------------------------------------
from app.schemas.card import CardResponse
from app.schemas.user import (
    UserCreate,
    UserResponse,
    RequestCodePayload,
    VerifyCodePayload,
)
from app.schemas.collection import (
    CollectionCreate,
    CollectionResponse,
    AddCardToCollectionPayload,
    UserCardResponse,
    UserCardSearchItem,
    UserCardSearchResponse,
)
from app.schemas.deck import (
    DeckCreate,
    DeckResponse,
    AddCardToDeckPayload,
    DeckCardDetailResponse,
)
from app.schemas.wishlist import (
    WishlistAddPayload,
    WishlistItemResponse,
    MostWantedCardItem,
    MostWantedResponse,
)
from app.schemas.trade import (
    TradeMarketItemResponse,
    MatchedCard,
    TradeMatchUserResponse,
    TradeProposalItemCreate,
    TradeProposalCreatePayload,
    TradeProposalItemResponse,
    TradeProposalResponse,
    TradeFeedbackPayload,
)
from app.schemas.price import (
    PuntoPrecio,
    ResumenPreciosActuales,
    HistorialPreciosResponse,
)

__all__ = [
    "CardResponse",
    "UserCreate",
    "UserResponse",
    "RequestCodePayload",
    "VerifyCodePayload",
    "CollectionCreate",
    "CollectionResponse",
    "AddCardToCollectionPayload",
    "UserCardResponse",
    "UserCardSearchItem",
    "UserCardSearchResponse",
    "DeckCreate",
    "DeckResponse",
    "AddCardToDeckPayload",
    "DeckCardDetailResponse",
    "WishlistAddPayload",
    "WishlistItemResponse",
    "MostWantedCardItem",
    "MostWantedResponse",
    "TradeMarketItemResponse",
    "MatchedCard",
    "TradeMatchUserResponse",
    "TradeProposalItemCreate",
    "TradeProposalCreatePayload",
    "TradeProposalItemResponse",
    "TradeProposalResponse",
    "TradeFeedbackPayload",
    "PuntoPrecio",
    "ResumenPreciosActuales",
    "HistorialPreciosResponse",
]