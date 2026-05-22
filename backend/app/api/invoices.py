# backend/app/api/invoices.py
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

UPLOAD_DIR = "uploads"
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