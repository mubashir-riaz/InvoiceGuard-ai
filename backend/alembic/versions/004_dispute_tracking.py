"""add dispute status tracking columns and dispute_events table

Revision ID: 004
Revises: 003
Create Date: 2026-09-11 12:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Expand PostgreSQL enum type with additional lifecycle statuses
    new_statuses = [
        "UNDER_REVIEW",
        "ACCEPTED",
        "PARTIALLY_APPROVED",
        "REJECTED",
        "REFUNDED",
        "ESCALATED",
        "EXPIRED",
    ]
    for status in new_statuses:
        op.execute(f"ALTER TYPE disputestatus ADD VALUE IF NOT EXISTS '{status}'")

    # 2. Add tracking and resolution columns to disputes table
    op.add_column("disputes", sa.Column("claimed_amount", sa.Float(), nullable=True, server_default="0.0"))
    op.add_column("disputes", sa.Column("recovered_amount", sa.Float(), nullable=True, server_default="0.0"))
    op.add_column("disputes", sa.Column("response_date", sa.Date(), nullable=True))
    op.add_column("disputes", sa.Column("carrier_response", sa.Text(), nullable=True))
    op.add_column("disputes", sa.Column("rejection_reason", sa.String(500), nullable=True))
    op.add_column("disputes", sa.Column("escalated", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("disputes", sa.Column("follow_up_date", sa.Date(), nullable=True))

    # 3. Create dispute timeline history table
    op.create_table(
        "dispute_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, index=True),
        sa.Column("dispute_id", sa.BigInteger(), sa.ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("old_status", sa.String(50), nullable=True),
        sa.Column("new_status", sa.String(50), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

def downgrade() -> None:
    op.drop_table("dispute_events")
    op.drop_column("disputes", "follow_up_date")
    op.drop_column("disputes", "escalated")
    op.drop_column("disputes", "rejection_reason")
    op.drop_column("disputes", "carrier_response")
    op.drop_column("disputes", "response_date")
    op.drop_column("disputes", "recovered_amount")
    op.drop_column("disputes", "claimed_amount")
