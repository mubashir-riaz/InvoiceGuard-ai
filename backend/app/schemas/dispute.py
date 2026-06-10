# Pydantic schemas for Dispute API.
from pydantic import BaseModel
from typing import Optional
from app.models.dispute import DisputeStatus

class DisputeBase(BaseModel):
    invoice_id: int
    discrepancy_id: Optional[int] = None
    carrier: str
    draft_body: Optional[str] = None

class DisputeCreate(DisputeBase):
    pass

class DisputeResponse(DisputeBase):
    id: int
    status: DisputeStatus

    class Config:
        from_attributes = True

class DisputeUpdate(BaseModel):
    draft_body: str