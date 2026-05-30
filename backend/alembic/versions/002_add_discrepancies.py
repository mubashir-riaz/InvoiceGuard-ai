"""add discrepancies table

Revision ID: 002
Revises: 001
Create Date: 2025-03-21 10:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "discrepancies",
        sa.Column("id", sa.BigInteger(), primary_key=True, index=True),
        sa.Column("invoice_id", sa.BigInteger(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("line_item_id", sa.BigInteger(), sa.ForeignKey("line_items.id"), nullable=True),
        sa.Column("expected_amount", sa.Float(), nullable=False),
        sa.Column("charged_amount", sa.Float(), nullable=False),
        sa.Column("difference", sa.Float(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=True),
    )

def downgrade() -> None:
    op.drop_table("discrepancies")