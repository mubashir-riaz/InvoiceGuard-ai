# Endpoints to manage dispute emails.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.dispute import Dispute, DisputeStatus
from app.schemas.dispute import DisputeCreate, DisputeResponse, DisputeUpdate

router = APIRouter(prefix="/disputes", tags=["disputes"])

@router.get("/", response_model=List[DisputeResponse])
async def list_disputes(invoice_id: int = None, db: AsyncSession = Depends(get_db)):
    query = select(Dispute)
    if invoice_id:
        query = query.where(Dispute.invoice_id == invoice_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{dispute_id}", response_model=DisputeResponse)
async def get_dispute(dispute_id: int, db: AsyncSession = Depends(get_db)):
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return dispute

@router.put("/{dispute_id}", response_model=DisputeResponse)
async def update_dispute(dispute_id: int, update: DisputeUpdate, db: AsyncSession = Depends(get_db)):
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    dispute.draft_body = update.draft_body
    await db.commit()
    await db.refresh(dispute)
    return dispute

@router.post("/{dispute_id}/send", response_model=DisputeResponse)
async def send_dispute(dispute_id: int, db: AsyncSession = Depends(get_db)):
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    dispute.status = DisputeStatus.SENT
    await db.commit()
    await db.refresh(dispute)
    return dispute