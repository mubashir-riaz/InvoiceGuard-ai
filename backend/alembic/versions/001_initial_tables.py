"""initial tables

Revision ID: 001
Revises:
Create Date: 2025-03-20 12:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
    )
    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("carrier", sa.String(100), nullable=False),
        sa.Column("rate_details", sa.JSON(), nullable=False),
        sa.Column("effective_start", sa.Date(), nullable=False),
        sa.Column("effective_end", sa.Date(), nullable=False),
    )
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("contract_id", sa.Integer(), sa.ForeignKey("contracts.id"), nullable=True),
        sa.Column("invoice_number", sa.String(100), nullable=False, unique=True),
        sa.Column("carrier", sa.String(100), nullable=False),
        sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("status", sa.Enum("uploaded","processing","extracted","audited","disputed","error", name="invoicestatus"), server_default="uploaded", nullable=False),
        sa.Column("file_path", sa.String(500), nullable=True),
    )
    op.create_table(
        "line_items",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("tracking_number", sa.String(100), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("charged_amount", sa.Float(), nullable=True),
    )

def downgrade() -> None:
    op.drop_table("line_items")
    op.drop_table("invoices")
    op.drop_table("contracts")
    op.drop_table("clients")
    op.execute("DROP TYPE invoicestatus")