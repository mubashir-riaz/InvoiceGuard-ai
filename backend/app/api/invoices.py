# Invoice CRUD + file upload endpoint.
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
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

from app.models.line_item import LineItem
from app.schemas.line_item import LineItemResponse

@router.get("/{invoice_id}/line-items", response_model=List[LineItemResponse])
async def get_invoice_line_items(invoice_id: int, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    result = await db.execute(select(LineItem).where(LineItem.invoice_id == invoice_id))
    return result.scalars().all()

@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    from app.models.line_item import LineItem
    from app.models.discrepancy import Discrepancy
    from app.models.dispute import Dispute

    # Clean up associated records before deleting invoice to prevent FK constraint violations
    await db.execute(delete(Dispute).where(Dispute.invoice_id == invoice_id))
    await db.execute(delete(Discrepancy).where(Discrepancy.invoice_id == invoice_id))
    await db.execute(delete(LineItem).where(LineItem.invoice_id == invoice_id))

    # Delete physical file from disk if present
    if invoice.file_path and os.path.exists(invoice.file_path):
        try:
            os.remove(invoice.file_path)
        except OSError:
            pass

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
    if invoice.status == InvoiceStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Invoice already in progress")

    from app.models.line_item import LineItem
    from app.models.discrepancy import Discrepancy
    from app.models.dispute import Dispute

    # Clean up existing line items, discrepancies, and disputes if re-running
    await db.execute(delete(Discrepancy).where(Discrepancy.invoice_id == invoice_id))
    await db.execute(delete(Dispute).where(Dispute.invoice_id == invoice_id))
    await db.execute(delete(LineItem).where(LineItem.invoice_id == invoice_id))

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

import csv
import io
from fastapi.responses import Response

@router.get("/{invoice_id}/export")
async def export_invoice_audit_csv(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """
    Export line items and audit discrepancy results for an invoice as a CSV file.
    """
    invoice = await db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    from app.models.line_item import LineItem
    from app.models.discrepancy import Discrepancy

    # Fetch line items
    items_result = await db.execute(select(LineItem).where(LineItem.invoice_id == invoice_id))
    line_items = items_result.scalars().all()

    # Fetch discrepancies
    disc_result = await db.execute(select(Discrepancy).where(Discrepancy.invoice_id == invoice_id))
    discrepancies = disc_result.scalars().all()
    disc_map = {d.line_item_id: d for d in discrepancies if d.line_item_id is not None}

    output = io.StringIO()
    writer = csv.writer(output)

    # Write summary metadata rows
    writer.writerow(["# INVOICE AUDIT REPORT"])
    writer.writerow(["Invoice Number", invoice.invoice_number])
    writer.writerow(["Carrier", invoice.carrier])
    writer.writerow(["Invoice Date", str(invoice.invoice_date)])
    writer.writerow(["Total Billed Amount", f"${invoice.total_amount:.2f}"])
    status_label = invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status)
    writer.writerow(["Audit Status", status_label])
    writer.writerow([])

    # Write line items header
    writer.writerow([
        "Tracking Number",
        "Description",
        "Weight (kg)",
        "Billed Amount ($)",
        "Expected Amount ($)",
        "Difference ($)",
        "Discrepancy Reason",
        "Audit Result"
    ])

    total_expected = 0.0
    total_difference = 0.0

    for item in line_items:
        disc = disc_map.get(item.id)
        if disc:
            expected = disc.expected_amount
            difference = disc.difference
            reason = disc.reason or "Rate Mismatch"
            audit_result = "OVERCHARGE" if difference > 0 else "UNDERCHARGE"
        else:
            expected = item.charged_amount or 0.0
            difference = 0.0
            reason = "None"
            audit_result = "PASSED"

        total_expected += expected
        total_difference += difference

        writer.writerow([
            item.tracking_number or "N/A",
            item.description or "",
            f"{item.weight_kg:.2f}" if item.weight_kg is not None else "0.00",
            f"{item.charged_amount:.2f}" if item.charged_amount is not None else "0.00",
            f"{expected:.2f}",
            f"{difference:.2f}",
            reason,
            audit_result
        ])

    # Summary row
    writer.writerow([])
    writer.writerow([
        "TOTALS",
        f"{len(line_items)} items",
        "",
        f"${invoice.total_amount:.2f}",
        f"${total_expected:.2f}",
        f"${total_difference:.2f}",
        f"{len(discrepancies)} Discrepancies",
        "CLAIMABLE" if total_difference > 0 else "BALANCED"
    ])

    csv_content = output.getvalue()
    filename = f"audit_invoice_{invoice.invoice_number}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )