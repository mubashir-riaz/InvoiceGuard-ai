# backend/app/api/contracts.py
# CRUD endpoints for Contracts.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractResponse

router = APIRouter(prefix="/contracts", tags=["contracts"])

@router.post("/", response_model=ContractResponse, status_code=201)
async def create_contract(contract_in: ContractCreate, db: AsyncSession = Depends(get_db)):
    contract = Contract(**contract_in.model_dump())
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    return contract

@router.get("/", response_model=List[ContractResponse])
async def list_contracts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contract))
    return result.scalars().all()

@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@router.put("/{contract_id}", response_model=ContractResponse)
async def update_contract(contract_id: int, contract_in: ContractCreate, db: AsyncSession = Depends(get_db)):
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    for field, value in contract_in.model_dump().items():
        setattr(contract, field, value)
    await db.commit()
    await db.refresh(contract)
    return contract

@router.delete("/{contract_id}", status_code=204)
async def delete_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    contract = await db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    await db.delete(contract)
    await db.commit()
    return None