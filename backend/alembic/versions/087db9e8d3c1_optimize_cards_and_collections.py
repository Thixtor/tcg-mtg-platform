"""optimize_cards_and_collections

Revision ID: 087db9e8d3c1
Revises: 
Create Date: 2026-09-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Identificadores requeridos por Alembic:
revision: str = '087db9e8d3c1'
down_revision: Union[str, None] = '225b6409105a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Habilitar extensión trigram en PostgreSQL para acelerar ILIKE %q%
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2. Agregar columnas nativas en 'cartas' para evitar cast pesados de JSON
    op.add_column('cartas', sa.Column('cmc', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('cartas', sa.Column('rarity', sa.String(), nullable=True))
    op.add_column('cartas', sa.Column('colors', sa.String(), nullable=True))
    op.add_column('cartas', sa.Column('oracle_text', sa.String(), nullable=True))

    # 3. Crear índice Trigram en el nombre de la carta
    op.create_index(
        'ix_cartas_name_trgm',
        'cartas',
        ['name'],
        postgresql_using='gin',
        postgresql_ops={'name': 'gin_trgm_ops'}
    )

    # 4. Agregar columnas de visibilidad y arte en collections
    op.add_column('collections', sa.Column('is_public_trade', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('collections', sa.Column('art_url', sa.String(), nullable=True))

    # 5. Restricción única para evitar duplicados en mazos por categoría
    op.create_unique_constraint(
        'uq_deck_card_category',
        'deck_cards',
        ['deck_id', 'scryfall_card_id', 'category']
    )


def downgrade():
    op.drop_constraint('uq_deck_card_category', 'deck_cards', type_='unique')
    op.drop_column('collections', 'art_url')
    op.drop_column('collections', 'is_public_trade')
    op.drop_index('ix_cartas_name_trgm', table_name='cartas')
    op.drop_column('cartas', 'oracle_text')
    op.drop_column('cartas', 'colors')
    op.drop_column('cartas', 'rarity')
    op.drop_column('cartas', 'cmc')