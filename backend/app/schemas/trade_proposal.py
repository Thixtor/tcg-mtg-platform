# app/services/trade_proposal_service.py
# ============================================================================
# SERVICIO DE DOMINIO: NEGOCIACIÓN E INVENTARIO P2P (BLACK MARKET)
# ============================================================================
# ARQUITECTURA & REGLAS:
# - Soporta tanto propuestas de intercambio como de COMPRA DIRECTA EN EFECTIVO.
# - Homogeneiza 'offered_card_ids' y 'requested_cards' en ítems de propuesta.
# - Bloqueo pesimista con 'with_for_update' para prevenir doble gasto de cartas.
# - Transferencia física atómica preservando claves foráneas (FK RESTRICT).
# ============================================================================

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
    def _validate_and_lock_user_cards(
        cls,
        db: Session,
        card_ids: List[str],
        expected_owner_id: str,
        side_label: str
    ) -> Dict[str, UserCard]:
        if not card_ids:
            return {}

        clean_ids = [cid for cid in card_ids if cid]
        if len(clean_ids) != len(set(clean_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Existen cartas duplicadas en la lista de items {side_label}."
            )

        locked_cards = {
            c.id: c for c in (
                db.query(UserCard)
                .join(Collection, UserCard.collection_id == Collection.id)
                .filter(
                    UserCard.id.in_(clean_ids),
                    Collection.user_id == expected_owner_id
                )
                .with_for_update()
                .all()
            )
        }

        for cid in clean_ids:
            uc = locked_cards.get(cid)
            if not uc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La carta {cid} ({side_label}) no existe o no pertenece al usuario esperado."
                )
            if uc.quantity < 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cantidad física insuficiente para la carta {uc.id}."
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

        # 1. Consolidar ítems ofrecidos
        offered_card_ids: List[str] = []
        if payload.offered_card_ids:
            offered_card_ids.extend(payload.offered_card_ids)
        for it in payload.items:
            if it.side == "offered" and it.user_card_id:
                offered_card_ids.append(it.user_card_id)

        # 2. Consolidar cartas o intenciones solicitadas
        requested_count = len(payload.requested_cards) + sum(1 for it in payload.items if it.side == "requested")

        # Validación: Debe existir al menos cartas ofrecidas, cartas solicitadas o compensación en efectivo
        cash_val = Decimal(str(payload.cash_amount or 0.0))
        if not offered_card_ids and requested_count == 0 and cash_val <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Una propuesta debe incluir al menos una carta o un monto en efectivo."
            )

        # Si no se especificó pagador de efectivo, por defecto es el proponente
        cash_payer = payload.cash_payer_id
        if cash_val > Decimal("0.00") and not cash_payer:
            cash_payer = str(proposer.id)

        # Validar posesión física de las cartas ofrecidas por el proponente
        cls._validate_and_lock_user_cards(
            db, 
            card_ids=offered_card_ids, 
            expected_owner_id=str(proposer.id), 
            side_label="ofrecidas"
        )

        proposal = TradeProposal(
            proposer_id=str(proposer.id),
            receiver_id=str(receiver.id),
            status=TradeStatus.PROPOSED.value,
            cash_amount=cash_val,
            cash_currency=payload.cash_currency or "COP",
            cash_payer_id=cash_payer,
            notes=payload.notes
        )
        db.add(proposal)
        db.flush()

        # Registrar ítems ofrecidos de los binders
        for card_id in set(offered_card_ids):
            db.add(TradeProposalItem(
                proposal_id=proposal.id,
                user_card_id=card_id,
                side="offered",
                quantity=1
            ))

        # Registrar cartas solicitadas
        for req in payload.requested_cards:
            db.add(TradeProposalItem(
                proposal_id=proposal.id,
                user_card_id=None,
                side="requested",
                quantity=req.quantity or 1,
                agreed_price_usd=Decimal(str(req.price_usd or 0.0))
            ))

        # Ítems provenientes del formato clásico si existen
        for it in payload.items:
            if it.user_card_id and it.user_card_id not in offered_card_ids:
                db.add(TradeProposalItem(
                    proposal_id=proposal.id,
                    user_card_id=it.user_card_id,
                    side=it.side,
                    quantity=it.quantity,
                    agreed_price_usd=Decimal(str(it.agreed_price_usd)) if it.agreed_price_usd is not None else None
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
        
        # Reducir stock sin borrar la fila para preservar la integridad de FK RESTRICT
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

        # Transferencia física solo para ítems vinculados a un UserCard real
        for item in proposal.items:
            if not item.user_card_id:
                continue

            uc = db.query(UserCard).filter(UserCard.id == item.user_card_id).with_for_update().first()
            if not uc:
                continue

            if item.side == "offered":
                cls._transfer_card_instance(db, uc, str(proposal.receiver_id), item.quantity)
            elif item.side == "requested":
                cls._transfer_card_instance(db, uc, str(proposal.proposer_id), item.quantity)

        # Registrar trade exitoso en el modelo User para sumar reputación
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
                    user_card_id=str(it.user_card_id) if it.user_card_id else None,
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