# Endpoints to manage dispute emails and lifecycle tracking.
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.models.dispute import Dispute, DisputeStatus, DisputeEvent
from app.models.invoice import Invoice, InvoiceStatus
from app.schemas.dispute import (
    DisputeCreate,
    DisputeResponse,
    DisputeUpdate,
    DisputeStatusUpdate,
    DisputeResponseRecord,
    DisputeEscalateRequest,
    DisputeFollowUpRequest,
    DisputeEventResponse,
    DisputeTimelineResponse,
)

router = APIRouter(prefix="/disputes", tags=["disputes"])

async def _log_dispute_event(
    db: AsyncSession,
    dispute_id: int,
    old_status: Optional[str],
    new_status: str,
    note: Optional[str] = None
) -> DisputeEvent:
    event = DisputeEvent(
        dispute_id=dispute_id,
        old_status=str(old_status) if old_status else None,
        new_status=str(new_status),
        note=note,
    )
    db.add(event)
    return event

@router.get("/", response_model=List[DisputeResponse])
async def list_disputes(
    invoice_id: Optional[int] = None,
    status: Optional[DisputeStatus] = None,
    escalated: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Dispute)
    if invoice_id is not None:
        query = query.where(Dispute.invoice_id == invoice_id)
    if status is not None:
        query = query.where(Dispute.status == status)
    if escalated is not None:
        query = query.where(Dispute.escalated == escalated)
    result = await db.execute(query.order_by(Dispute.id.desc()))
    return result.scalars().all()

@router.get("/pending-followups", response_model=List[DisputeResponse])
async def get_pending_followups(db: AsyncSession = Depends(get_db)):
    """Retrieve all active disputes that have reached or passed their follow-up reminder date."""
    today = date.today()
    query = select(Dispute).where(
        and_(
            Dispute.follow_up_date != None,
            Dispute.follow_up_date <= today,
            Dispute.status.not_in([DisputeStatus.REFUNDED, DisputeStatus.EXPIRED, DisputeStatus.REJECTED])
        )
    )
    result = await db.execute(query.order_by(Dispute.follow_up_date.asc()))
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
    
    old_status = dispute.status
    dispute.status = DisputeStatus.SENT

    # Log timeline event
    await _log_dispute_event(
        db,
        dispute_id=dispute.id,
        old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
        new_status=DisputeStatus.SENT.value,
        note="Dispute claim email dispatched to carrier billing department",
    )

    # Update invoice status to DISPUTED
    invoice = await db.get(Invoice, dispute.invoice_id)
    if invoice:
        invoice.status = InvoiceStatus.DISPUTED

    await db.commit()
    await db.refresh(dispute)
    return dispute

@router.post("/{dispute_id}/status", response_model=DisputeResponse)
async def update_dispute_status(
    dispute_id: int,
    payload: DisputeStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Transition dispute lifecycle status with optional audit note."""
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    old_status = dispute.status
    dispute.status = payload.new_status

    await _log_dispute_event(
        db,
        dispute_id=dispute.id,
        old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
        new_status=payload.new_status.value,
        note=payload.note or f"Status transitioned to {payload.new_status.value}",
    )

    await db.commit()
    await db.refresh(dispute)
    return dispute

@router.post("/{dispute_id}/record-response", response_model=DisputeResponse)
async def record_carrier_response(
    dispute_id: int,
    payload: DisputeResponseRecord,
    db: AsyncSession = Depends(get_db)
):
    """Record carrier's reply, recovered dollar amount, and resolution outcome."""
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    old_status = dispute.status

    if payload.recovered_amount is not None:
        dispute.recovered_amount = payload.recovered_amount
    if payload.response_date is not None:
        dispute.response_date = payload.response_date
    else:
        dispute.response_date = date.today()
    if payload.carrier_response is not None:
        dispute.carrier_response = payload.carrier_response
    if payload.rejection_reason is not None:
        dispute.rejection_reason = payload.rejection_reason

    # Infer or update status
    if payload.status is not None:
        dispute.status = payload.status
    elif payload.recovered_amount and payload.claimed_amount and payload.recovered_amount >= payload.claimed_amount:
        dispute.status = DisputeStatus.ACCEPTED
    elif payload.recovered_amount and payload.recovered_amount > 0:
        dispute.status = DisputeStatus.PARTIALLY_APPROVED
    elif payload.rejection_reason:
        dispute.status = DisputeStatus.REJECTED

    note = payload.note or f"Carrier response logged. Recovered: ${dispute.recovered_amount:.2f}."
    if dispute.rejection_reason:
        note += f" Reason: {dispute.rejection_reason}"

    await _log_dispute_event(
        db,
        dispute_id=dispute.id,
        old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
        new_status=dispute.status.value if hasattr(dispute.status, "value") else str(dispute.status),
        note=note,
    )

    await db.commit()
    await db.refresh(dispute)
    return dispute

@router.post("/{dispute_id}/escalate", response_model=DisputeResponse)
async def escalate_dispute(
    dispute_id: int,
    payload: DisputeEscalateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Escalate a rejected or unresolved carrier dispute to leadership/legal."""
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    old_status = dispute.status
    dispute.escalated = True
    dispute.status = DisputeStatus.ESCALATED

    await _log_dispute_event(
        db,
        dispute_id=dispute.id,
        old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
        new_status=DisputeStatus.ESCALATED.value,
        note=payload.note or "Dispute flagged as ESCALATED for management review.",
    )

    await db.commit()
    await db.refresh(dispute)
    return dispute

@router.post("/{dispute_id}/follow-up", response_model=DisputeResponse)
async def schedule_follow_up(
    dispute_id: int,
    payload: DisputeFollowUpRequest,
    db: AsyncSession = Depends(get_db)
):
    """Set follow-up reminder target date for pending carrier responses."""
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.follow_up_date = payload.follow_up_date

    await _log_dispute_event(
        db,
        dispute_id=dispute.id,
        old_status=dispute.status.value if hasattr(dispute.status, "value") else str(dispute.status),
        new_status=dispute.status.value if hasattr(dispute.status, "value") else str(dispute.status),
        note=payload.note or f"Follow-up reminder scheduled for {payload.follow_up_date.isoformat()}.",
    )

    await db.commit()
    await db.refresh(dispute)
    return dispute

@router.get("/{dispute_id}/timeline", response_model=DisputeTimelineResponse)
async def get_dispute_timeline(dispute_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve full audit trail of dispute state changes and notes."""
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    result = await db.execute(
        select(DisputeEvent)
        .where(DisputeEvent.dispute_id == dispute_id)
        .order_by(DisputeEvent.created_at.asc())
    )
    events = result.scalars().all()

    return DisputeTimelineResponse(
        dispute_id=dispute.id,
        current_status=dispute.status,
        events=events,
    )

@router.delete("/{dispute_id}", status_code=204)
async def delete_dispute(dispute_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a dispute claim and its associated audit timeline events."""
    dispute = await db.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    await db.execute(delete(DisputeEvent).where(DisputeEvent.dispute_id == dispute_id))
    await db.delete(dispute)
    await db.commit()