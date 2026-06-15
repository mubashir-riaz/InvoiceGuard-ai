# Invoice CRUD + file upload endpoint.
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.schemas.invoice import InvoiceCreate, InvoiceResponse
from app.services.queue import enqueue_task
from app.core.config import settings  

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.post("/upload", response_model=InvoiceResponse, status_code=201)
async def upload_invoice(
    client_id: int = Form(...),
    contract_id: Optional[int] = Form(None),
    invoice_number: str = Form(...),
    carrier: str = Form(...),
    invoice_date: date = Form(...),
    total_amount: float = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Save file to disk
    file_path = os.path.join(UPLOAD_DIR, f"{invoice_number}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    invoice = Invoice(
        client_id=client_id,
        contract_id=contract_id,
        invoice_number=invoice_number,
        carrier=carrier,
        invoice_date=invoice_date,
        total_amount=total_amount,
        file_path=file_path,
        status=InvoiceStatus.UPLOADED,
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return invoice

@router.get("/", response_model=List[InvoiceResponse])
async def list_invoices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invoice))
    return result.scalars().all()

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Optionally delete the file from disk
    if invoice.file_path and os.path.exists(invoice.file_path):
        os.remove(invoice.file_path)
    await db.delete(invoice)
    await db.commit()
    return None

@router.post("/{invoice_id}/process", status_code=202)
async def process_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Trigger asynchronous extraction of line items from the uploaded PDF.
    The worker will update the invoice status and create line items.
    """
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.UPLOADED:
        raise HTTPException(status_code=400, detail="Invoice already processed or in progress")

    # Mark as processing immediately
    invoice.status = InvoiceStatus.PROCESSING
    await db.commit()

    # Enqueue the extraction task
    await enqueue_task("extract_invoice_lines", invoice.id)
    return {"message": "Processing started", "invoice_id": invoice_id}

from app.services.queue import enqueue_task

@router.post("/{invoice_id}/audit", status_code=202)
async def audit_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Trigger audit (matching + discrepancy detection) for an extracted invoice.
    """
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.EXTRACTED:
        raise HTTPException(status_code=400, detail="Invoice must be in 'extracted' status before audit")

    # Mark as processing immediately
    invoice.status = InvoiceStatus.PROCESSING
    await db.commit()

    # Enqueue the matching task
    await enqueue_task("match_and_audit", invoice_id)
    return {"message": "Audit started", "invoice_id": invoice_id}

from app.services.queue import enqueue_task

@router.post("/{invoice_id}/generate-dispute", status_code=202)
async def generate_dispute(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Trigger dispute email generation for all discrepancies of this invoice.
    """
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != InvoiceStatus.AUDITED:
        raise HTTPException(status_code=400, detail="Invoice must be audited first")

    await enqueue_task("generate_dispute", invoice_id)
    return {"message": "Dispute generation started", "invoice_id": invoice_id}