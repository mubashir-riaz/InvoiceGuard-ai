# Background task: generate a professional dispute email using LangChain + Groq.
from sqlalchemy import select
from db import get_session
from models import Invoice, Discrepancy, Dispute, DisputeStatus, Contract
from config import GROQ_API_KEY

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from sqlalchemy.orm import selectinload

# Initialize Groq LLM via LangChain
llm = ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name="llama-3.3-70b-versatile",
    temperature=0.2,
)

# Prompt template for dispute email
dispute_prompt = PromptTemplate(
    input_variables=["carrier", "invoice_number", "invoice_date", "discrepancies_text", "contract_rates"],
    template="""
You are a senior freight auditor writing a formal dispute email to {carrier}.

Invoice: {invoice_number} dated {invoice_date}
Our contracted rates: {contract_rates}

We found the following overcharges:
{discrepancies_text}

Write a professional email that:
- Politely points out each discrepancy
- Cites the contracted rates
- Requests a refund or credit for the total difference
- Includes a table of the discrepancies if possible
- Asks for confirmation within 7 business days

Use a formal tone. Do NOT include any placeholder text. The email should be ready to send.
"""
)

chain = dispute_prompt | llm


async def generate_dispute(ctx, invoice_id: int):
    """
    1. Fetch invoice + its discrepancies + contract.
    2. Format the discrepancies into text.
    3. Run LangChain LLM to generate email draft.
    4. Save to disputes table.
    """
    db = await get_session()
    try:
        # Fetch invoice
        invoice = await db.get(Invoice, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Fetch discrepancies for this invoice
        result = await db.execute(
            select(Discrepancy)
            .options(selectinload(Discrepancy.line_item))
            .where(Discrepancy.invoice_id == invoice.id)
        )
        discrepancies = result.scalars().all()

        # Fetch contract (if any)
        contract = None
        if invoice.contract_id:
            contract = await db.get(Contract, invoice.contract_id)
        contract_rates = contract.rate_details if contract else "Not available"

        # Format discrepancies as text table
        lines = []
        total_diff = 0.0
        for d in discrepancies:
            tracking = d.line_item.tracking_number if d.line_item else 'N/A'
            lines.append(
                f"Tracking: {tracking}, "
                f"Expected: ${d.expected_amount:.2f}, Charged: ${d.charged_amount:.2f}, "
                f"Difference: ${d.difference:.2f} ({d.reason})"
            )
            total_diff += d.difference
        discrepancies_text = "\n".join(lines)
        discrepancies_text += f"\nTotal overcharge: ${total_diff:.2f}"

        # Generate email via LangChain (v1 pipe syntax)
        response = await chain.ainvoke({
            "carrier": invoice.carrier,
            "invoice_number": invoice.invoice_number,
            "invoice_date": str(invoice.invoice_date),
            "discrepancies_text": discrepancies_text,
            "contract_rates": str(contract_rates)
        })
        email_body = response.content

        # Save dispute
        dispute = Dispute(
            invoice_id=invoice.id,
            carrier=invoice.carrier,
            draft_body=email_body.strip(),
            status=DisputeStatus.DRAFT
        )
        db.add(dispute)
        await db.commit()
        return {"status": "generated", "dispute_id": dispute.id}

    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()