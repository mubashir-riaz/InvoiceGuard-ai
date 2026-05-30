# Background task: match extracted line items against contract rates,
# compute expected charges, and flag discrepancies.
from db import get_session
from models import Invoice, InvoiceStatus, LineItem, Discrepancy, Contract
from sqlalchemy import select
import json


# Simple calculator: expects rate_details to be a dict with optional keys:
# "base_rate": flat fee per shipment
# "per_kg": rate per kilogram
# You can extend this logic later.
def calculate_expected(rate_details: dict, weight_kg: float | None) -> float:
    if weight_kg is None:
        return 0.0   # cannot compute; might be flagged separately
    base = rate_details.get("base_rate", 0.0)
    per_kg = rate_details.get("per_kg", 0.0)
    return base + per_kg * weight_kg

async def match_and_audit(ctx, invoice_id: int):
    """
    1. Load invoice with line items.
    2. If invoice has a contract, fetch it; else cannot audit (skip or flag).
    3. For each line item, compute expected amount using contract rates.
    4. Compare with charged_amount; if difference > 0.01 (1 cent), create Discrepancy.
    5. Mark invoice as AUDITED.
    """
    db = await get_session()
    try:
        # 1. Fetch invoice + line items
        invoice = await db.get(Invoice, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # 2. Fetch contract (if linked)
        contract = None
        if invoice.contract_id:
            contract = await db.get(Contract, invoice.contract_id)
        if contract is None:
            # No contract – we cannot audit. Mark as audited? Maybe set status to 'no_contract'.
            # For now, just log and mark as audited with no discrepancies.
            invoice.status = InvoiceStatus.AUDITED
            await db.commit()
            return {"status": "no_contract", "message": "Invoice has no linked contract"}

        rate_details = contract.rate_details_dict   # Parse JSON to dict

        # 3. Load line items (relationship eager loaded would be better, but we can query)
        line_items = await db.execute(
            select(LineItem).where(LineItem.invoice_id == invoice.id)
        )
        line_items = line_items.scalars().all()

        if not line_items:
            invoice.status = InvoiceStatus.AUDITED
            await db.commit()
            return {"status": "no_line_items"}

        # 4. Compare each line item
        discrepancies_found = 0
        for li in line_items:
            expected = calculate_expected(rate_details, li.weight_kg)
            diff = round((li.charged_amount or 0.0) - expected, 2)
            if abs(diff) > 0.01:   # threshold 1 cent
                reason = None
                if abs(diff) > 0:
                    reason = "Overcharge" if diff > 0 else "Undercharge"
                disc = Discrepancy(
                    invoice_id=invoice.id,
                    line_item_id=li.id,
                    expected_amount=expected,
                    charged_amount=li.charged_amount or 0.0,
                    difference=diff,
                    reason=reason,
                )
                db.add(disc)
                discrepancies_found += 1

        # 5. Mark as audited
        invoice.status = InvoiceStatus.AUDITED
        await db.commit()
        return {"status": "audited", "discrepancies_count": discrepancies_found}

    except Exception:
        # Rollback and leave status as is
        await db.rollback()
        raise
    finally:
        await db.close()