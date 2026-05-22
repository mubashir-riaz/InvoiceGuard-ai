# backend/app/schemas/contract.py
# Pydantic models for Contract CRUD.
from pydantic import BaseModel
from datetime import date
from typing import Any, Dict

class ContractBase(BaseModel):
    client_id: int
    carrier: str
    rate_details: Dict[str, Any]
    effective_start: date
    effective_end: date

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int

    class Config:
        from_attributes = True