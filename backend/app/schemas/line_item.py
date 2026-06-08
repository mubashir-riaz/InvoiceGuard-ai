# backend/app/schemas/line_item.py
# Pydantic schema for LineItem (read-only for now).
from pydantic import BaseModel
from typing import Optional

class LineItemResponse(BaseModel):
    id: int
    invoice_id: int
    tracking_number: Optional[str]
    description: Optional[str]
    weight_kg: Optional[float]
    charged_amount: Optional[float]

    class Config:
        from_attributes = True