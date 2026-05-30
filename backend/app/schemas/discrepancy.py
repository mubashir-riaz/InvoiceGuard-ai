# backend/app/schemas/discrepancy.py
# Pydantic schemas for Discrepancy API.
from pydantic import BaseModel
from typing import Optional

class DiscrepancyBase(BaseModel):
    invoice_id: int
    line_item_id: Optional[int] = None
    expected_amount: float
    charged_amount: float
    difference: float
    reason: Optional[str] = None

class DiscrepancyResponse(DiscrepancyBase):
    id: int

    class Config:
        from_attributes = True