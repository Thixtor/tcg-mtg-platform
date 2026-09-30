"""finalize_production_indexes_and_canonical_domain

Revision ID: c4a11b9d0e23
Revises: 087db9e8d3c1
Create Date: 2026-09-30
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c4a11b9d0e23'
down_revision: Union[str, None] = '087db9e8d3c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. SEGURIDAD Y ESTABILIDAD: DEFAULT EN OTP ATTEMPTS
    # ---------------------------------------------------------
    # Asegura server_default='0' en users.otp_attempts para inserciones seguras
    op.alter_column(
        'users',
        'otp_attempts',
        existing_type=sa.Integer(),
        nullable=False,
        server_default='0'
    )

    # ---------------------------------------------------------
    # 2. RESTAURAR ÍNDICE CRÍTICO DE WISHLIST
    # ---------------------------------------------------------
    # Repone el índice eliminado por error en la migración 225b6409105a
    op.create_index(
        'ix_wishlist_items_user_id',
        'wishlist_items',
        ['user_id'],
        unique=False
    )

    # Restricción única para evitar cartas duplicadas en la wishlist de un usuario
    op.create_unique_constraint(
        'uq_wishlist_user_card',
        'wishlist_items',
        ['user_id', 'scryfall_card_id']
    )

    # ---------------------------------------------------------
    # 3. DOMINIO CANÓNICO MTG: ORACLE_ID EN CATÁLOGO
    # ---------------------------------------------------------
    # Agregar columna oracle_id a 'cartas' si no existe
    op.add_column(
        'cartas',
        sa.Column('oracle_id', sa.String(), nullable=True)
    )
    op.create_index(
        'ix_cartas_oracle_id',
        'cartas',
        ['oracle_id'],
        unique=False
    )

    # Índices complementarios para acelerar el buscador y los filtros
    op.create_index(
        'ix_cartas_type_line',
        'cartas',
        ['type_line'],
        unique=False
    )
    op.create_index(
        'ix_cartas_cmc',
        'cartas',
        ['cmc'],
        unique=False
    )
    op.create_index(
        'ix_cartas_rarity',
        'cartas',
        ['rarity'],
        unique=False
    )

    # ---------------------------------------------------------
    # 4. BACKFILL AUTOMÁTICO DE DATOS CANÓNICOS DESDE JSONB
    # ---------------------------------------------------------
    # Extraer oracle_id, cmc y colors desde scryfall_raw_data para cartas existentes
    op.execute("""
        UPDATE cartas
        SET 
            oracle_id = COALESCE(
                scryfall_raw_data->>'oracle_id',
                scryfall_raw_data->'card_faces'->0->>'oracle_id'
            ),
            cmc = COALESCE(
                (scryfall_raw_data->>'cmc')::float,
                cmc,
                0.0
            ),
            type_line = COALESCE(
                type_line,
                scryfall_raw_data->>'type_line'
            )
        WHERE oracle_id IS NULL OR cmc = 0.0 OR type_line IS NULL;
    """)

    # ---------------------------------------------------------
    # 5. INTEGRIDAD Y AUDITORÍA EN COLECCIONES DE USUARIO
    # ---------------------------------------------------------
    # Columna created_at para orden determinista en user_cards
    op.add_column(
        'user_cards',
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now())
    )


def downgrade() -> None:
    op.drop_column('user_cards', 'created_at')
    op.drop_index('ix_cartas_rarity', table_name='cartas')
    op.drop_index('ix_cartas_cmc', table_name='cartas')
    op.drop_index('ix_cartas_type_line', table_name='cartas')
    op.drop_index('ix_cartas_oracle_id', table_name='cartas')
    op.drop_column('cartas', 'oracle_id')
    op.drop_constraint('uq_wishlist_user_card', 'wishlist_items', type_='unique')
    op.drop_index('ix_wishlist_items_user_id', table_name='wishlist_items')
    op.alter_column(
        'users',
        'otp_attempts',
        existing_type=sa.Integer(),
        nullable=False,
        server_default=None
    )