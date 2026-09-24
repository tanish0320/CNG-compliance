"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-22 21:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'idempotency_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('payload_hash', sa.String(length=64), nullable=False),
        sa.Column('request_payload', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('response_result', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key')
    )
    op.create_index(op.f('ix_idempotency_records_idempotency_key'), 'idempotency_records', ['idempotency_key'], unique=True)

    op.create_table(
        'verification_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=True),
        sa.Column('vehicle_registration', sa.String(length=20), nullable=False),
        sa.Column('ocr_confidence', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('compliance_id', sa.String(length=100), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('source_reference', sa.String(length=255), nullable=True),
        sa.Column('rule_version', sa.String(length=10), nullable=False),
        sa.Column('manual_review_required', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_verification_records_idempotency_key'), 'verification_records', ['idempotency_key'], unique=False)
    op.create_index(op.f('ix_verification_records_vehicle_registration'), 'verification_records', ['vehicle_registration'], unique=False)

    op.create_table(
        'audit_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('verification_id', sa.Uuid(), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('actor', sa.String(length=128), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['verification_id'], ['verification_records.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_events_verification_id'), 'audit_events', ['verification_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_events_verification_id'), table_name='audit_events')
    op.drop_table('audit_events')
    op.drop_index(op.f('ix_verification_records_vehicle_registration'), table_name='verification_records')
    op.drop_index(op.f('ix_verification_records_idempotency_key'), table_name='verification_records')
    op.drop_table('verification_records')
    op.drop_index(op.f('ix_idempotency_records_idempotency_key'), table_name='idempotency_records')
    op.drop_table('idempotency_records')
