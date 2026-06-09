# Endpoints to list discrepancies, optionally filtered by invoice.
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.models.discrepancy import Discrepancy
from app.schemas.discrepancy import DiscrepancyResponse

router = APIRouter(prefix="/discrepancies", tags=["discrepancies"])

@router.get("/", response_model=List[DiscrepancyResponse])
async def list_discrepancies(
    invoice_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Discrepancy)
    if invoice_id is not None:
        query = query.where(Discrepancy.invoice_id == invoice_id)
    result = await db.execute(query)
    return result.scalars().all()