# backend/app/models/__init__.py
# Import all models here so Alembic can auto-discover them.
from app.models.base import Base
from app.models.client import Client
from app.models.contract import Contract
from app.models.invoice import Invoice
from app.models.line_item import LineItem