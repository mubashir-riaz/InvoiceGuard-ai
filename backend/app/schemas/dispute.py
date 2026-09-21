# Pydantic schemas for Dispute API.
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.models.dispute import DisputeStatus

class DisputeBase(BaseModel):
    invoice_id: int
    discrepancy_id: Optional[int] = None
    carrier: str
    draft_body: Optional[str] = None

class DisputeCreate(DisputeBase):
    claimed_amount: Optional[float] = 0.0

class DisputeResponse(DisputeBase):
    id: int
    status: DisputeStatus
    claimed_amount: Optional[float] = 0.0
    recovered_amount: Optional[float] = 0.0
    response_date: Optional[date] = None
    carrier_response: Optional[str] = None
    rejection_reason: Optional[str] = None
    escalated: bool = False
    follow_up_date: Optional[date] = None

    class Config:
        from_attributes = True

class DisputeUpdate(BaseModel):
    draft_body: str

class DisputeStatusUpdate(BaseModel):
    new_status: DisputeStatus
    note: Optional[str] = None

class DisputeResponseRecord(BaseModel):
    recovered_amount: Optional[float] = 0.0
    response_date: Optional[date] = None
    carrier_response: Optional[str] = None
    rejection_reason: Optional[str] = None
    status: Optional[DisputeStatus] = None
    note: Optional[str] = None

class DisputeEscalateRequest(BaseModel):
    note: Optional[str] = None

class DisputeFollowUpRequest(BaseModel):
    follow_up_date: date
    note: Optional[str] = None

class DisputeEventResponse(BaseModel):
    id: int
    dispute_id: int
    old_status: Optional[str] = None
    new_status: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DisputeTimelineResponse(BaseModel):
    dispute_id: int
    current_status: DisputeStatus
    events: List[DisputeEventResponse]