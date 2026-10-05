# app/services/trade_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: PROPUESTAS DE TRADE Y REPUTACIÓN P2P
# ---------------------------------------------------------
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload, contains_eager
from fastapi import HTTPException, status

from app.models import UserCard, Collection, CartaScryfall, User
from app.models.trade_proposal import TradeProposal, TradeProposalItem, TradeStatus
from app.schemas.trade import (
    TradeMarketItemResponse,
    TradeProposalCreatePayload,
    TradeProposalResponse,
    TradeProposalItemResponse,
    TradeFeedbackPayload,
)


class TradeService:
    """
    Servicio de Dominio para el Muro de Intercambio (TradeWall),
    gestión del agregado TradeProposal y cálculo atómico de reputación.
    """

    @classmethod
    def get_public_trade_items(
        cls,
        db: Session,
        limit: int = 24,
        offset: int = 0
    ) -> List[TradeMarketItemResponse]:
        query = (
            db.query(UserCard)
            .join(UserCard.collection)
            .join(Collection.owner)
            .options(
                joinedload(UserCard.card_catalog).defer(CartaScryfall.scryfall_raw_data),
                contains_eager(UserCard.collection).contains_eager(Collection.owner)
            )
            .filter(
                UserCard.is_for_trade.is_(True),
                Collection.is_public_trade.is_(True)
            )
        )

        if hasattr(UserCard, "created_at"):
            query = query.order_by(getattr(UserCard, "created_at").desc())
        else:
            query = query.order_by(UserCard.id.desc())

        items_trade = query.offset(offset).limit(limit).all()

        market_items: List[TradeMarketItemResponse] = []
        for item in items_trade:
            catalog_entry = item.card_catalog
            owner_entry = item.collection.owner

            card_name = getattr(catalog_entry, "name", "Carta") if catalog_entry else "Carta"
            set_code = getattr(catalog_entry, "set", None) if catalog_entry else None
            image_url = getattr(catalog_entry, "image_url", None) if catalog_entry else None

            username = getattr(owner_entry, "username", "Anónimo") if owner_entry else "Anónimo"
            reputation = getattr(owner_entry, "reputation_score", 100) or 100

            market_items.append(
                TradeMarketItemResponse(
                    user_card_id=str(item.id),
                    card_name=card_name,
                    set_code=set_code,
                    image_url=image_url,
                    condition=item.condition,
                    language=item.language,
                    is_foil=item.is_foil,
                    trade_notes=item.trade_notes,
                    owner_username=username,
                    owner_reputation=reputation
                )
            )

        return market_items

    # -------------------------------------------------------------------------
    # GESTIÓN DE PROPUESTAS DE INTERCAMBIO (AGGREGATE ROOT)
    # -------------------------------------------------------------------------
    @classmethod
    def create_proposal(
        cls,
        db: Session,
        proposer_id: str,
        payload: TradeProposalCreatePayload
    ) -> TradeProposal:
        if str(proposer_id) == str(payload.receiver_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes crear una propuesta de intercambio contigo mismo."
            )

        receiver = db.query(User).filter(User.id == payload.receiver_id).first()
        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario destinatario no existe."
            )

        # Validar pertenencia y disponibilidad de cada carta involucrada
        for item_data in payload.items:
            uc = (
                db.query(UserCard)
                .join(Collection, UserCard.collection_id == Collection.id)
                .filter(UserCard.id == item_data.user_card_id)
                .first()
            )
            if not uc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"La carta de inventario con id '{item_data.user_card_id}' no existe."
                )

            expected_owner_id = proposer_id if item_data.side == "offered" else payload.receiver_id
            if str(uc.collection.user_id) != str(expected_owner_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La carta '{item_data.user_card_id}' no pertenece al usuario esperado para el lado '{item_data.side}'."
                )

            if uc.quantity < item_data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cantidad insuficiente para la carta '{item_data.user_card_id}'. Disponible: {uc.quantity}, Solicitada: {item_data.quantity}."
                )

        proposal = TradeProposal(
            proposer_id=proposer_id,
            receiver_id=payload.receiver_id,
            status=TradeStatus.PROPOSED.value,
            cash_amount=payload.cash_amount,
            cash_currency=payload.cash_currency,
            cash_payer_id=payload.cash_payer_id,
            notes=payload.notes,
        )
        db.add(proposal)
        db.flush()

        for item_data in payload.items:
            prop_item = TradeProposalItem(
                proposal_id=proposal.id,
                user_card_id=item_data.user_card_id,
                side=item_data.side,
                quantity=item_data.quantity,
                agreed_price_usd=item_data.agreed_price_usd,
            )
            db.add(prop_item)

        db.commit()
        db.refresh(proposal)
        return proposal

    @classmethod
    def get_proposals_for_user(
        cls,
        db: Session,
        user_id: str,
        status_filter: Optional[str] = None
    ) -> List[TradeProposal]:
        query = (
            db.query(TradeProposal)
            .filter(
                (TradeProposal.proposer_id == user_id) | (TradeProposal.receiver_id == user_id)
            )
        )
        if status_filter:
            query = query.filter(TradeProposal.status == status_filter.lower())

        return query.order_by(TradeProposal.created_at.desc()).all()

    @classmethod
    def get_proposal_by_id(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = db.query(TradeProposal).filter(TradeProposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Propuesta de intercambio no encontrada."
            )
        if str(proposal.proposer_id) != str(user_id) and str(proposal.receiver_id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para consultar esta propuesta."
            )
        return proposal

    @classmethod
    def accept_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = cls.get_proposal_by_id(db, proposal_id, user_id)
        try:
            proposal.accept(user_id)
            db.commit()
            db.refresh(proposal)
            return proposal
        except (ValueError, PermissionError) as err:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def reject_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = cls.get_proposal_by_id(db, proposal_id, user_id)
        try:
            proposal.reject(user_id)
            db.commit()
            db.refresh(proposal)
            return proposal
        except (ValueError, PermissionError) as err:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def cancel_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = cls.get_proposal_by_id(db, proposal_id, user_id)
        try:
            proposal.cancel(user_id)
            db.commit()
            db.refresh(proposal)
            return proposal
        except (ValueError, PermissionError) as err:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def complete_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        """Marca como completada la propuesta e incrementa atómicamente el contador de trades."""
        proposal = cls.get_proposal_by_id(db, proposal_id, user_id)
        try:
            proposal.complete(user_id)

            # Incrementar contador de intercambios completados para ambas partes
            proposer = db.query(User).filter(User.id == proposal.proposer_id).first()
            receiver = db.query(User).filter(User.id == proposal.receiver_id).first()

            if proposer:
                proposer.completed_trades = (proposer.completed_trades or 0) + 1
                proposer.reputation_score = (proposer.reputation_score or 100) + 10
            if receiver:
                receiver.completed_trades = (receiver.completed_trades or 0) + 1
                receiver.reputation_score = (receiver.reputation_score or 100) + 10

            db.commit()
            db.refresh(proposal)
            return proposal
        except (ValueError, PermissionError) as err:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    @classmethod
    def submit_feedback(
        cls,
        db: Session,
        proposal_id: str,
        author_id: str,
        payload: TradeFeedbackPayload
    ) -> dict:
        """
        Calcula la reputación de la contraparte tras finalizar un trade.
        Actualiza el puntaje de reputación y el promedio ponderado de rating.
        """
        proposal = cls.get_proposal_by_id(db, proposal_id, author_id)
        if proposal.status != TradeStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo puedes calificar intercambios que se encuentren en estado 'completed'."
            )

        # La contraparte a calificar
        target_user_id = proposal.receiver_id if str(proposal.proposer_id) == str(author_id) else proposal.proposer_id
        target_user = db.query(User).filter(User.id == target_user_id).first()

        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario a calificar no encontrado.")

        # Actualizar reputación
        current_rep = target_user.reputation_score or 100
        current_rating = target_user.rating or 5.0
        completed = max(target_user.completed_trades or 1, 1)

        if payload.successful:
            # Calificación positiva incrementa reputación proporcionalmente al rating
            rep_gain = int(payload.rating * 2)  # Entre 2 y 10 puntos extra
            target_user.reputation_score = current_rep + rep_gain
        else:
            # Disputa o falla reduce severamente el puntaje e incrementa disputas
            target_user.reputation_score = max(0, current_rep - 30)
            target_user.disputes_count = (target_user.disputes_count or 0) + 1

        # Promedio ponderado de rating
        target_user.rating = round(((current_rating * (completed - 1)) + payload.rating) / completed, 2)

        db.commit()
        db.refresh(target_user)

        return {
            "target_user_id": str(target_user.id),
            "target_username": target_user.username,
            "reputation_score": target_user.reputation_score,
            "rating": target_user.rating,
            "completed_trades": target_user.completed_trades,
            "disputes_count": target_user.disputes_count
        }

    @classmethod
    def map_proposal_to_dto(cls, proposal: TradeProposal) -> TradeProposalResponse:
        """Mapeo seguro a DTO incluyendo metadatos de las cartas."""
        items_dto: List[TradeProposalItemResponse] = []
        for it in proposal.items:
            card_name = None
            image_url = None
            if it.user_card and it.user_card.card_catalog:
                card_name = it.user_card.card_catalog.name
                image_url = it.user_card.card_catalog.image_url

            items_dto.append(
                TradeProposalItemResponse(
                    id=str(it.id),
                    user_card_id=str(it.user_card_id),
                    side=str(it.side),
                    quantity=int(it.quantity),
                    agreed_price_usd=float(it.agreed_price_usd) if it.agreed_price_usd is not None else None,
                    card_name=card_name,
                    image_url=image_url
                )
            )

        return TradeProposalResponse(
            id=str(proposal.id),
            proposer_id=str(proposal.proposer_id),
            receiver_id=str(proposal.receiver_id),
            status=str(proposal.status),
            cash_amount=float(proposal.cash_amount or 0.0),
            cash_currency=str(proposal.cash_currency or "COP"),
            cash_payer_id=str(proposal.cash_payer_id) if proposal.cash_payer_id else None,
            notes=proposal.notes,
            created_at=proposal.created_at,
            updated_at=proposal.updated_at,
            items=items_dto
        )