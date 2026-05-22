# backend/app/schemas/invoice.py
# Pydantic models for Invoice CRUD and file upload.
from pydantic import BaseModel
from datetime import date
from typing import Optional
from app.models.invoice import InvoiceStatus

class InvoiceBase(BaseModel):
    client_id: int
    contract_id: Optional[int] = None
    invoice_number: str
    carrier: str
    invoice_date: date
    total_amount: float

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceResponse(InvoiceBase):
    id: int
    status: InvoiceStatus
    file_path: Optional[str] = None

    class Config:
        from_attributes = True