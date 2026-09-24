"""002_system_config

Revision ID: 002_system_config
Revises: 001_initial_schema
Create Date: 2026-09-23 20:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '002_system_config'
down_revision: str | None = '001_initial_schema'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'system_configs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('updated_by', sa.String(length=128), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index(op.f('ix_system_configs_key'), 'system_configs', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_system_configs_key'), table_name='system_configs')
    op.drop_table('system_configs')
