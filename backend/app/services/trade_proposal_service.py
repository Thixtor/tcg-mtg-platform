# app/services/trade_proposal_service.py
# ---------------------------------------------------------
# SERVICIO DE DOMINIO: PROPUESTAS Y NEGOCIACIONES DE TRADE (DDD)
# ---------------------------------------------------------
"""
Servicio de dominio para la orquestación de transacciones de intercambio.
Implementa validaciones estrictas de propiedad, disponibilidad y visibilidad,
bloqueo pesimista de inventario y transferencia atómica de cartas.
"""
from typing import List, Dict, Optional, Set
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.trade_proposal import TradeProposal, TradeProposalItem, TradeStatus
from app.models.collection import Collection, UserCard
from app.models.user import User
from app.schemas.trade_proposal import (
    CreateTradeProposalPayload,
    TradeProposalResponse,
    TradeProposalItemPayload
)


class TradeProposalService:

    @classmethod
    def build_response_dto(cls, proposal: TradeProposal, requester_id: str) -> TradeProposalResponse:
        """
        Construye la respuesta aplicando política de privacidad estricta sobre PII:
        El teléfono solo se expone bidireccionalmente cuando el trade fue aceptado o completado.
        """
        can_reveal_contact = proposal.status in (TradeStatus.ACCEPTED.value, TradeStatus.COMPLETED.value)
        contact_phone = None

        if can_reveal_contact:
            if str(proposal.proposer_id) == str(requester_id):
                contact_phone = proposal.receiver.phone_number if proposal.receiver else None
            elif str(proposal.receiver_id) == str(requester_id):
                contact_phone = proposal.proposer.phone_number if proposal.proposer else None

        return TradeProposalResponse(
            id=str(proposal.id),
            proposer_id=str(proposal.proposer_id),
            receiver_id=str(proposal.receiver_id),
            status=proposal.status,
            cash_amount=proposal.cash_amount,
            cash_currency=proposal.cash_currency,
            cash_payer_id=str(proposal.cash_payer_id) if proposal.cash_payer_id else None,
            notes=proposal.notes,
            contact_phone=contact_phone,
            offered_items_count=len([i for i in proposal.items if i.side == "offered"]),
            requested_items_count=len([i for i in proposal.items if i.side == "requested"])
        )

    @classmethod
    def _validate_and_lock_items(
        cls,
        db: Session,
        items_payload: List[TradeProposalItemPayload],
        expected_owner_id: str,
        side_label: str,
        must_be_public_trade: bool = False
    ) -> Dict[str, UserCard]:
        """
        Valida que cada carta exista, pertenezca al usuario esperado,
        tenga cantidad suficiente y cumpla las reglas de visibilidad pública.
        Aplica un bloqueo FOR UPDATE a nivel de fila para prevenir carreras.
        """
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

        # Bloqueo pesimista para consistencia transaccional
        locked_cards = {c.id: c for c in query.with_for_update().all()}

        for item in items_payload:
            uc = locked_cards.get(item.user_card_id)
            if not uc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"La carta {item.user_card_id} ({side_label}) no existe, no pertenece al usuario "
                        f"esperado o no está disponible para intercambio público."
                    )
                )
            if uc.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cantidad insuficiente para la carta {uc.id}. Solicitado: {item.quantity}, disponible: {uc.quantity}."
                )

        return locked_cards

    @classmethod
    def create_proposal(
        cls, 
        db: Session, 
        proposer: User, 
        payload: CreateTradeProposalPayload
    ) -> TradeProposal:
        """
        Crea una propuesta de trade validando posesión real de cartas del proponente
        y disponibilidad en carpetas públicas marcadas para intercambio del receptor.
        """
        if str(proposer.id) == payload.receiver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No puedes crear un intercambio contigo mismo."
            )

        # 1. Validar existencia del receptor
        receiver = db.query(User).filter(User.id == payload.receiver_id).first()
        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario receptor no existe."
            )

        # 2. Validar pagador en compensación económica
        if payload.cash_amount and payload.cash_amount > Decimal("0.00"):
            if payload.cash_payer_id not in (str(proposer.id), str(receiver.id)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El pagador de la compensación monetaria debe ser proponente o receptor."
                )

        # 3. Validar listas no vacías simultáneamente
        if not payload.offered_user_card_ids and not payload.requested_user_card_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Una propuesta debe incluir al menos una carta ofrecida o solicitada."
            )

        # 4. Validar y bloquear cartas ofrecidas (Dueño: Proponente)
        locked_offered = cls._validate_and_lock_items(
            db, 
            payload.offered_user_card_ids, 
            expected_owner_id=str(proposer.id), 
            side_label="ofrecidas",
            must_be_public_trade=False
        )

        # 5. Validar y bloquear cartas solicitadas (Dueño: Receptor, Binders públicos y for_trade)
        locked_requested = cls._validate_and_lock_items(
            db, 
            payload.requested_user_card_ids, 
            expected_owner_id=str(receiver.id), 
            side_label="solicitadas",
            must_be_public_trade=True
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

        for item in payload.offered_user_card_ids:
            db.add(TradeProposalItem(
                proposal_id=proposal.id, 
                user_card_id=item.user_card_id, 
                side="offered", 
                quantity=item.quantity
            ))

        for item in payload.requested_user_card_ids:
            db.add(TradeProposalItem(
                proposal_id=proposal.id, 
                user_card_id=item.user_card_id, 
                side="requested", 
                quantity=item.quantity
            ))

        db.commit()
        db.refresh(proposal)
        return proposal

    @classmethod
    def get_user_proposals(cls, db: Session, user_id: str) -> List[TradeProposal]:
        return (
            db.query(TradeProposal)
            .options(
                joinedload(TradeProposal.proposer),
                joinedload(TradeProposal.receiver)
            )
            .filter((TradeProposal.proposer_id == user_id) | (TradeProposal.receiver_id == user_id))
            .order_by(TradeProposal.updated_at.desc())
            .all()
        )

    @classmethod
    def get_proposal_by_id_or_fail(cls, db: Session, proposal_id: str, user_id: str) -> TradeProposal:
        proposal = (
            db.query(TradeProposal)
            .options(
                joinedload(TradeProposal.proposer),
                joinedload(TradeProposal.receiver)
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
    def _transfer_card_instance(
        cls,
        db: Session,
        source_user_card: UserCard,
        target_user_id: str,
        quantity_to_move: int
    ) -> None:
        """
        Transfiere físicamente copias de cartas entre usuarios de forma atómica:
        Descuenta del origen y añade/fusiona en el binder principal del destino.
        """
        # Descontar del origen
        if source_user_card.quantity < quantity_to_move:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Disponibilidad insuficiente durante la transferencia de la carta {source_user_card.id}."
            )
        
        source_user_card.quantity -= quantity_to_move
        if source_user_card.quantity == 0:
            db.delete(source_user_card)

        # Localizar o crear binder destino
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

        # Añadir al inventario del receptor
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
        """
        Finaliza el trade de forma atómica:
        1. Transiciona la máquina de estados a COMPLETED.
        2. Bloquea las cartas y transfiere el inventario físico entre las partes.
        3. Acredita la reputación P2P a ambos participantes.
        """
        proposal = (
            db.query(TradeProposal)
            .filter(TradeProposal.id == proposal_id)
            .with_for_update()
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

        # Transferencia física atómica de cartas
        for item in proposal.items:
            uc = db.query(UserCard).filter(UserCard.id == item.user_card_id).with_for_update().first()
            if not uc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La carta física {item.user_card_id} ya no existe en el inventario."
                )

            if item.side == "offered":
                # Del proponente al receptor
                cls._transfer_card_instance(db, uc, str(proposal.receiver_id), item.quantity)
            elif item.side == "requested":
                # Del receptor al proponente
                cls._transfer_card_instance(db, uc, str(proposal.proposer_id), item.quantity)

        # Bonificación de reputación en ambos participantes
        if proposal.proposer:
            proposal.proposer.register_successful_trade()
        if proposal.receiver:
            proposal.receiver.register_successful_trade()

        db.commit()
        db.refresh(proposal)
        return proposal