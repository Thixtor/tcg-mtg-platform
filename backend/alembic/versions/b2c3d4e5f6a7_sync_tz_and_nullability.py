"""sync_tz_and_nullability

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-05 16:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Asegurar consistencia de datos antes de aplicar el NOT NULL
    op.execute("UPDATE users SET created_at = NOW() WHERE created_at IS NULL;")
    op.alter_column(
        'users',
        'created_at',
        existing_type=sa.DateTime(timezone=True),
        nullable=False
    )


def downgrade() -> None:
    op.alter_column(
        'users',
        'created_at',
        existing_type=sa.DateTime(timezone=True),
        nullable=True
    )