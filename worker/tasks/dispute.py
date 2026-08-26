# Background task: generate a professional dispute email using LLM (Groq / Gemini).
from sqlalchemy import select
from db import get_session
from models import Invoice, Discrepancy, Dispute, DisputeStatus, Contract
from config import GROQ_API_KEY, GEMINI_API_KEY, LLM_PROVIDER
from sqlalchemy.orm import selectinload

DISPUTE_PROMPT_TEMPLATE = """You are a senior freight auditor writing a formal dispute email to {carrier}.

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

Use a formal tone. Do NOT include any placeholder text. The email should be ready to send."""


async def _generate_email_text(
    carrier: str,
    invoice_number: str,
    invoice_date: str,
    discrepancies_text: str,
    contract_rates: str,
) -> str:
    """Generate dispute email using the configured LLM provider (Groq or Gemini) with fallback."""
    provider = (LLM_PROVIDER or "groq").lower()

    # 1. Try Gemini if selected or if only Gemini key is available
    if (provider == "gemini" or not GROQ_API_KEY) and GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            prompt = DISPUTE_PROMPT_TEMPLATE.format(
                carrier=carrier,
                invoice_number=invoice_number,
                invoice_date=invoice_date,
                discrepancies_text=discrepancies_text,
                contract_rates=contract_rates,
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"Gemini dispute generation failed: {e}")

    # 2. Try Groq if selected or if Groq key is available
    if GROQ_API_KEY:
        candidate_models = ["llama-3.3-70b-versatile", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
        for model in candidate_models:
            try:
                from langchain_groq import ChatGroq
                from langchain_core.prompts import PromptTemplate

                llm = ChatGroq(
                    groq_api_key=GROQ_API_KEY,
                    model_name=model,
                    temperature=0.2,
                )
                dispute_prompt = PromptTemplate(
                    input_variables=["carrier", "invoice_number", "invoice_date", "discrepancies_text", "contract_rates"],
                    template=DISPUTE_PROMPT_TEMPLATE
                )
                chain = dispute_prompt | llm
                response = await chain.ainvoke({
                    "carrier": carrier,
                    "invoice_number": invoice_number,
                    "invoice_date": invoice_date,
                    "discrepancies_text": discrepancies_text,
                    "contract_rates": contract_rates
                })
                if hasattr(response, "content") and response.content:
                    return str(response.content).strip()
            except Exception as e:
                print(f"Groq dispute generation with model '{model}' failed: {e}")

    # 3. Deterministic professional email fallback template
    return f"""Dear {carrier} Billing & Accounts Receivable Team,

We are writing to formally dispute rate discrepancies identified on Invoice #{invoice_number} (dated {invoice_date}).

According to our agreed contract terms ({contract_rates}), we have audited the billed shipments and identified the following overcharges:

{discrepancies_text}

Please review these line items and provide an adjustment credit or an updated invoice reflecting the contracted rates within 7 business days.

Thank you for your prompt assistance.

Sincerely,
Freight Audit & Claims Team"""


async def generate_dispute(ctx, invoice_id: int):
    """
    1. Fetch invoice + its discrepancies + contract.
    2. Format the discrepancies into text.
    3. Run LLM (Groq / Gemini) to generate email draft.
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
            tracking = d.line_item.tracking_number if d.line_item else "N/A"
            lines.append(
                f"- Tracking: {tracking} | Expected: ${d.expected_amount:.2f} | Charged: ${d.charged_amount:.2f} | Overcharge: ${d.difference:.2f} ({d.reason or 'Rate Mismatch'})"
            )
            total_diff += d.difference

        discrepancies_text = "\n".join(lines) if lines else "No specific line discrepancies flagged."
        discrepancies_text += f"\nTotal Overcharge: ${total_diff:.2f}"

        # Generate email via multi-provider LLM handler
        email_body = await _generate_email_text(
            carrier=invoice.carrier,
            invoice_number=invoice.invoice_number,
            invoice_date=str(invoice.invoice_date),
            discrepancies_text=discrepancies_text,
            contract_rates=str(contract_rates),
        )

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