# Import all models here so Alembic can auto-discover them.

from app.models.base import Base
from app.models.client import Client
from app.models.contract import Contract
from app.models.invoice import Invoice
from app.models.line_item import LineItem
from app.models.discrepancy import Discrepancy  
from app.models.dispute import Dispute