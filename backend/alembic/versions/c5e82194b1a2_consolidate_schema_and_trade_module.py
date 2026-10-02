# alembic/versions/c5e82194b1a2_consolidate_schema_and_trade_module.py
# --------------------------------------------------------------------------
# MIGRACIÓN CORRECTIVA: ALINEACIÓN COMPLETA DE MODELOS Y MÓDULO DE TRADE
# --------------------------------------------------------------------------
"""consolidate_schema_and_trade_module

Revision ID: c5e82194b1a2
Revises: 087db9e8d3c1
Create Date: 2026-10-02
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c5e82194b1a2'
down_revision: Union[str, None] = 'c4a11b9d0e23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # ----------------------------------------------------------------------
    # 1. Correcciones en 'cartas' (JSONB estricto + color_identity)
    # ----------------------------------------------------------------------
    # Asegurar conversión segura a JSONB si estaba en JSON plano
    op.execute(
        "ALTER TABLE cartas ALTER COLUMN scryfall_raw_data TYPE jsonb USING scryfall_raw_data::jsonb;"
    )
    
    # Agregar columna color_identity si no existe (evita depender de getattr vacío)
    op.add_column(
        'cartas',
        sa.Column('color_identity', sa.String(), nullable=True, server_default='')
    )
    op.create_index('ix_cartas_colors', 'cartas', ['colors'])

    # ----------------------------------------------------------------------
    # 2. Correcciones en 'users' (phone_number nullable para login por correo)
    # ----------------------------------------------------------------------
    op.alter_column('users', 'phone_number', nullable=True)

    # ----------------------------------------------------------------------
    # 3. Correcciones en 'collections' y 'user_cards'
    # ----------------------------------------------------------------------
    op.create_index('ix_collections_is_public_trade', 'collections', ['is_public_trade'])

    # Agregar created_at en user_cards si hiciera falta
    conn = op.get_bind()
    columns_user_cards = [c['name'] for c in sa.inspect(conn).get_columns('user_cards')]
    if 'created_at' not in columns_user_cards:
        op.add_column(
            'user_cards',
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()'))
        )

    # Prevenir duplicidad de copias idénticas en el mismo binder
    op.create_unique_constraint(
        'uq_collection_physical_card_instance',
        'user_cards',
        ['collection_id', 'scryfall_card_id', 'condition', 'is_foil', 'language']
    )

    # ----------------------------------------------------------------------
    # 4. Correcciones en 'decks' (featured_card_id)
    # ----------------------------------------------------------------------
    columns_decks = [c['name'] for c in sa.inspect(conn).get_columns('decks')]
    if 'featured_card_id' not in columns_decks:
        op.add_column(
            'decks',
            sa.Column('featured_card_id', sa.String(), nullable=True)
        )
        op.create_foreign_key(
            'fk_decks_featured_card',
            'decks', 'cartas',
            ['featured_card_id'], ['id'],
            ondelete='SET NULL'
        )

    # ----------------------------------------------------------------------
    # 5. Creación de tablas de Dominio: 'trade_proposals' e 'items'
    # ----------------------------------------------------------------------
    op.create_table(
        'trade_proposals',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('proposer_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('receiver_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='proposed', nullable=False),
        sa.Column('cash_amount', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False),
        sa.Column('cash_currency', sa.String(length=5), server_default='COP', nullable=False),
        sa.Column('cash_payer_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
    )
    op.create_index('ix_trade_proposals_proposer', 'trade_proposals', ['proposer_id'])
    op.create_index('ix_trade_proposals_receiver', 'trade_proposals', ['receiver_id'])
    op.create_index('ix_trade_proposals_status', 'trade_proposals', ['status'])

    op.create_table(
        'trade_proposal_items',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('proposal_id', sa.String(), sa.ForeignKey('trade_proposals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_card_id', sa.String(), sa.ForeignKey('user_cards.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('side', sa.String(length=20), nullable=False),  # 'offered' o 'requested'
        sa.Column('quantity', sa.Integer(), server_default='1', nullable=False),
        sa.Column('agreed_price_usd', sa.Numeric(precision=10, scale=2), nullable=True)
    )
    op.create_index('ix_trade_proposal_items_proposal', 'trade_proposal_items', ['proposal_id'])


def downgrade():
    op.drop_table('trade_proposal_items')
    op.drop_table('trade_proposals')
    op.drop_constraint('fk_decks_featured_card', 'decks', type_='foreignkey')
    op.drop_column('decks', 'featured_card_id')
    op.drop_constraint('uq_collection_physical_card_instance', 'user_cards', type_='unique')
    op.drop_index('ix_collections_is_public_trade', table_name='collections')
    op.alter_column('users', 'phone_number', nullable=False)
    op.drop_index('ix_cartas_colors', table_name='cartas')
    op.drop_column('cartas', 'color_identity')