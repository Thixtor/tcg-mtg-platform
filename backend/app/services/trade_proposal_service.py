# app/services/trade_proposal_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: NEGOCIACIÓN E INVENTARIO P2P (DDD)
# ---------------------------------------------------------
"""
Servicio de dominio para la orquestación de transacciones de intercambio.
Implementa validaciones estrictas de posesión y visibilidad, bloqueo pesimista
compatible con PostgreSQL y transferencia atómica de cartas respetando FK RESTRICT.
"""
from typing import List, Dict, Optional
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status

from app.models.trade_proposal import TradeProposal, TradeProposalItem, TradeStatus
from app.models.collection import Collection, UserCard
from app.models.user import User
from app.schemas.trade import (
    TradeProposalCreatePayload,
    TradeProposalResponse,
    TradeProposalItemResponse,
    TradeProposalItemCreate,
)


class TradeProposalService:

    # -------------------------------------------------------------------------
    # VALIDACIONES Y BLOQUEO PESIMISTA
    # -------------------------------------------------------------------------
    @classmethod
    def _validate_and_lock_items(
        cls,
        db: Session,
        items_payload: List[TradeProposalItemCreate],
        expected_owner_id: str,
        side_label: str,
        must_be_public_trade: bool = False
    ) -> Dict[str, UserCard]:
        if not items_payload:
            return {}

        card_ids = [item.user_card_id for item in items_payload]
        if len(card_ids) != len(set(card_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Existen cartas duplicadas en la lista de items {side_label}."
            )

        query = (
            db.query(UserCard)
            .join(Collection, UserCard.collection_id == Collection.id)
            .filter(
                UserCard.id.in_(card_ids),
                Collection.user_id == expected_owner_id
            )
        )

        if must_be_public_trade:
            query = query.filter(
                Collection.is_public_trade.is_(True),
                UserCard.is_for_trade.is_(True)
            )

        locked_cards = {c.id: c for c in query.with_for_update().all()}

        for item in items_payload:
            uc = locked_cards.get(item.user_card_id)
            if not uc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"La carta {item.user_card_id} ({side_label}) no existe, no pertenece al usuario "
                        f"esperado o no está habilitada para intercambio público."
                    )
                )
            if uc.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cantidad insuficiente para la carta {uc.id}. Solicitado: {item.quantity}, disponible: {uc.quantity}."
                )

        return locked_cards

    # -------------------------------------------------------------------------
    # GESTIÓN DEL CICLO DE VIDA DE PROPUESTAS
    # -------------------------------------------------------------------------
    @classmethod
    def create_proposal(
        cls, 
        db: Session, 
        proposer: User, 
        payload: TradeProposalCreatePayload
    ) -> TradeProposal:
        if str(proposer.id) == payload.receiver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No puedes crear un intercambio contigo mismo."
            )

        receiver = db.query(User).filter(User.id == payload.receiver_id).first()
        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario receptor no existe."
            )

        if payload.cash_amount and payload.cash_amount > Decimal("0.00"):
            if payload.cash_payer_id not in (str(proposer.id), str(receiver.id)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El pagador de la compensación monetaria debe ser proponente o receptor."
                )

        offered_items = [it for it in payload.items if it.side == "offered"]
        requested_items = [it for it in payload.items if it.side == "requested"]

        if not offered_items and not requested_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Una propuesta debe incluir al menos una carta ofrecida o solicitada."
            )

        cls._validate_and_lock_items(
            db, offered_items, expected_owner_id=str(proposer.id), side_label="ofrecidas", must_be_public_trade=False
        )
        cls._validate_and_lock_items(
            db, requested_items, expected_owner_id=str(receiver.id), side_label="solicitadas", must_be_public_trade=True
        )

        proposal = TradeProposal(
            proposer_id=str(proposer.id),
            receiver_id=str(receiver.id),
            status=TradeStatus.PROPOSED.value,
            cash_amount=payload.cash_amount or Decimal("0.00"),
            cash_currency=payload.cash_currency or "COP",
            cash_payer_id=payload.cash_payer_id,
            notes=payload.notes
        )
        db.add(proposal)
        db.flush()

        for it in payload.items:
            db.add(TradeProposalItem(
                proposal_id=proposal.id,
                user_card_id=it.user_card_id,
                side=it.side,
                quantity=it.quantity,
                agreed_price_usd=it.agreed_price_usd
            ))

        db.commit()
        db.refresh(proposal)
        return proposal

    @classmethod
    def get_user_proposals(cls, db: Session, user_id: str, status_filter: Optional[str] = None) -> List[TradeProposal]:
        query = (
            db.query(TradeProposal)
            .options(
                joinedload(TradeProposal.proposer),
                joinedload(TradeProposal.receiver),
                selectinload(TradeProposal.items).joinedload(TradeProposalItem.user_card).joinedload(UserCard.card_catalog)
            )
            .filter((TradeProposal.proposer_id == user_id) | (TradeProposal.receiver_id == user_id))
        )
        if status_filter:
            query = query.filter(TradeProposal.status == status_filter.lower())

        return query.order_by(TradeProposal.updated_at.desc()).all()

    @classmethod
    def get_proposal_by_id_or_fail(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = (
            db.query(TradeProposal)
            .options(
                joinedload(TradeProposal.proposer),
                joinedload(TradeProposal.receiver),
                selectinload(TradeProposal.items).joinedload(TradeProposalItem.user_card).joinedload(UserCard.card_catalog)
            )
            .filter(TradeProposal.id == proposal_id)
            .first()
        )
        if not proposal or (str(proposal.proposer_id) != str(user_id) and str(proposal.receiver_id) != str(user_id)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Propuesta no encontrada o no tienes permisos para consultarla."
            )
        return proposal

    @classmethod
    def accept_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = cls.get_proposal_by_id_or_fail(db, proposal_id, user_id)
        try:
            proposal.accept(user_id)
        except PermissionError as pe:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

        db.commit()
        db.refresh(proposal)
        return proposal

    @classmethod
    def reject_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = cls.get_proposal_by_id_or_fail(db, proposal_id, user_id)
        try:
            proposal.reject(user_id)
        except PermissionError as pe:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

        db.commit()
        db.refresh(proposal)
        return proposal

    @classmethod
    def cancel_proposal(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = cls.get_proposal_by_id_or_fail(db, proposal_id, user_id)
        try:
            proposal.cancel(user_id)
        except PermissionError as pe:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

        db.commit()
        db.refresh(proposal)
        return proposal

    # -------------------------------------------------------------------------
    # TRANSFERENCIA FÍSICA Y CIERRE ATÓMICO (COMPATIBLE CON FK RESTRICT)
    # -------------------------------------------------------------------------
    @classmethod
    def _transfer_card_instance(
        cls,
        db: Session,
        source_user_card: UserCard,
        target_user_id: str,
        quantity_to_move: int
    ) -> None:
        if source_user_card.quantity < quantity_to_move:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Disponibilidad insuficiente durante la transferencia de la carta {source_user_card.id}."
            )
        
        # Reducir stock sin borrar fila para preservar integridad de FK RESTRICT
        source_user_card.quantity -= quantity_to_move
        if source_user_card.quantity == 0:
            source_user_card.is_for_trade = False

        target_collection = (
            db.query(Collection)
            .filter(Collection.user_id == target_user_id)
            .first()
        )
        if not target_collection:
            target_collection = Collection(
                user_id=target_user_id,
                name="Binder Principal",
                is_public_trade=True
            )
            db.add(target_collection)
            db.flush()

        target_collection.add_card(
            scryfall_card_id=source_user_card.scryfall_card_id,
            quantity=quantity_to_move,
            condition=source_user_card.condition,
            language=source_user_card.language,
            is_foil=source_user_card.is_foil,
            is_for_trade=False
        )

    @classmethod
    def complete_trade(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = (
            db.query(TradeProposal)
            .filter(TradeProposal.id == proposal_id)
            .with_for_update(of=TradeProposal)
            .first()
        )
        if not proposal or (str(proposal.proposer_id) != str(user_id) and str(proposal.receiver_id) != str(user_id)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Propuesta no encontrada."
            )

        try:
            proposal.complete(user_id)
        except PermissionError as pe:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

        # Transferencia física de inventario
        for item in proposal.items:
            uc = db.query(UserCard).filter(UserCard.id == item.user_card_id).with_for_update().first()
            if not uc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La carta física {item.user_card_id} ya no existe en el inventario."
                )

            if item.side == "offered":
                cls._transfer_card_instance(db, uc, str(proposal.receiver_id), item.quantity)
            elif item.side == "requested":
                cls._transfer_card_instance(db, uc, str(proposal.proposer_id), item.quantity)

        # Registrar trade exitoso en el modelo User
        if proposal.proposer:
            proposal.proposer.register_successful_trade()
        if proposal.receiver:
            proposal.receiver.register_successful_trade()

        db.commit()
        db.refresh(proposal)
        return proposal

    # -------------------------------------------------------------------------
    # DTO MAPPER OPTIMIZADO (EVITA N+1)
    # -------------------------------------------------------------------------
    @classmethod
    def map_proposal_to_dto(cls, proposal: TradeProposal) -> TradeProposalResponse:
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