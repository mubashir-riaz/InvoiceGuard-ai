"""add disputes table

Revision ID: 003
Revises: 002
Create Date: 2025-03-22 10:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "disputes",
        sa.Column("id", sa.BigInteger(), primary_key=True, index=True),
        sa.Column("invoice_id", sa.BigInteger(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("discrepancy_id", sa.BigInteger(), sa.ForeignKey("discrepancies.id"), nullable=True),
        sa.Column("carrier", sa.String(100), nullable=False),
        sa.Column("draft_body", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("DRAFT", "SENT", name="disputestatus"), server_default="DRAFT", nullable=False),
    )

def downgrade() -> None:
    op.drop_table("disputes")
    op.execute("DROP TYPE disputestatus")