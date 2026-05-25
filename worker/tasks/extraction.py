# worker/tasks/extraction.py
# Core background task: extract line items from an invoice PDF using a Vision LLM.
# Supports multiple LLM providers (Groq and Gemini) selectable via LLM_PROVIDER env var.
import json
import os
import base64
from io import BytesIO
from pdf2image import convert_from_path
from sqlalchemy import select
from worker.db import get_session
from worker.models import Invoice, InvoiceStatus, LineItem
from worker.config import LLM_PROVIDER, GROQ_API_KEY, GEMINI_API_KEY, UPLOAD_DIR

# 1. LLM Client Abstraction

class BaseLLMClient:
    """Abstract base for LLM providers."""
    def extract_from_image(self, image_base64: str) -> dict:
        raise NotImplementedError


class GroqClient(BaseLLMClient):
    """Groq client using OpenAI-compatible API."""
    def __init__(self, api_key: str):
        from groq import Groq
        self.client = Groq(api_key=api_key)

    def extract_from_image(self, image_base64: str) -> dict:
        response = self.client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",  
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a freight invoice auditor. Extract every line item from the invoice image. "
                        "Return ONLY a JSON object with key 'line_items' (array of objects). "
                        "Each object must have: tracking_number (string|null), description (string|null), "
                        "weight_kg (float|null), charged_amount (float|null). "
                        "Do NOT include any other text or explanation."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all line items from this invoice page."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
                    ]
                }
            ],
            temperature=0.0,
            response_format={"type": "json_object"}  # Force JSON output (Llama 4 supports this)[reference:14]
        )
        return json.loads(response.choices[0].message.content)


class GeminiClient(BaseLLMClient):
    """Gemini client using Google's SDK."""
    def __init__(self, api_key: str):
        from google import genai
        from google.genai import types
        self.client = genai.Client(api_key=api_key)
        self.types = types

    def extract_from_image(self, image_base64: str) -> dict:
        # Decode base64 to bytes for Gemini's inline API[reference:15]
        image_bytes = base64.b64decode(image_base64)

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",  # Best free vision model[reference:16]
            contents=[
                self.types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                (
                    "Extract every line item from this freight invoice page. "
                    "Return ONLY a JSON object with key 'line_items' (array of objects). "
                    "Each object must have: tracking_number, description, weight_kg, charged_amount. "
                    "Use null for missing values. Do NOT include any other text."
                )
            ],
            generation_config={"temperature": 0.0, "response_mime_type": "application/json"}
        )
        return json.loads(response.text)

# 2. ARQ Task – Main Extraction

async def extract_invoice_lines(ctx, invoice_id: int):
    """
    ARQ task: 1. Load invoice, 2. Convert PDF to images, 3. Call Vision LLM,
              4. Parse JSON, 5. Store line items, 6. Update status.
    Supports both Groq and Gemini backends.
    """
    # Choose client based on LLM_PROVIDER
    if LLM_PROVIDER == "gemini":
        llm = GeminiClient(api_key=GEMINI_API_KEY)
    else:
        llm = GroqClient(api_key=GROQ_API_KEY)

    db = await get_session()
    try:
        # 1. Fetch invoice from DB
        invoice = await db.get(Invoice, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        if not invoice.file_path:
            raise ValueError("No PDF file attached")

        pdf_path = invoice.file_path
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")

        # 2. Convert PDF pages to images (200 DPI for quality)
        images = convert_from_path(pdf_path, dpi=200)
        if not images:
            raise RuntimeError("No pages extracted from PDF")

        all_line_items = []

        # 3. Process each page
        for page_num, image in enumerate(images, start=1):
            # Convert PIL Image to base64 PNG
            buffered = BytesIO()
            image.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

            # 4. Call vision LLM (provider-agnostic)
            data = llm.extract_from_image(img_base64)
            items = data.get("line_items", [])
            for item in items:
                item["page"] = page_num
            all_line_items.extend(items)

        # 5. Store line items in DB
        for item in all_line_items:
            line = LineItem(
                invoice_id=invoice.id,
                tracking_number=item.get("tracking_number"),
                description=item.get("description"),
                weight_kg=item.get("weight_kg"),
                charged_amount=item.get("charged_amount"),
            )
            db.add(line)

        # 6. Mark as EXTRACTED
        invoice.status = InvoiceStatus.EXTRACTED
        await db.commit()
        return {"status": "success", "line_items_count": len(all_line_items)}

    except Exception as e:
        # Mark as ERROR and re-raise
        try:
            invoice = await db.get(Invoice, invoice_id)
            if invoice:
                invoice.status = InvoiceStatus.ERROR
                await db.commit()
        except Exception:
            pass
        raise
    finally:
        await db.close()