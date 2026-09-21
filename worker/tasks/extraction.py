# Core background task: extract line items from an invoice PDF.
# Supports digital text extraction via pypdf, Vision/Text LLMs (Groq and Gemini),
# and a deterministic rule-based invoice parser fallback.
import json
import os
import re
import base64
from io import BytesIO
from sqlalchemy import select
from db import get_session
from models import Invoice, InvoiceStatus, LineItem
from config import LLM_PROVIDER, GROQ_API_KEY, GEMINI_API_KEY, UPLOAD_DIR

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None


# 1. Deterministic Rule-Based Fallback Parser

def extract_line_items_from_text(text: str) -> list[dict]:
    """
    Universal, multiline-aware freight invoice parser.
    Extracts tracking number, description, weight, and charged amount from any PDF text layout,
    including wrapped table cells and multi-line item records.
    """
    if not text or not text.strip():
        return []

    items = []

    # -------------------------------------------------------------
    # Strategy 1: Explicit Item / Shipment / Package block format
    # -------------------------------------------------------------
    # Strategy 1: Explicit Item / Shipment / Package block format
    # -------------------------------------------------------------
    blocks = re.split(
        r'(?:(?:^|\n)\s*(?:Item\s+\d+|SHIPMENT\s+\d+|Package\s+\d+|Shipment\s+Item\s+\d+)[:\.\s\-]*)',
        text,
        flags=re.IGNORECASE
    )
    if len(blocks) > 1:
        for b in blocks[1:]:
            b = re.split(r'(?:TOTAL\s+(?:CHARGED|DUE|AMOUNT|INVOICE)|SUBTOTAL)', b, flags=re.IGNORECASE)[0]

            trk_match = re.search(r'Tracking\s*(?:#|Number|No|Num)?\s*[:\s#]*([A-Za-z0-9\-]+)', b, re.IGNORECASE)
            desc_match = re.search(r'Description\s*[:\s]*([^\n\r]+)', b, re.IGNORECASE)
            wt_match = re.search(r'Weight\s*[:\s]*([\d\.,]+)\s*(?:kg|lbs|g)?', b, re.IGNORECASE)
            amt_match = re.search(r'(?:Charged\s*Amount|Total\s*Charged|Amount\s*Charged|Charged|Amount|Rate|Cost|Price|Total)\s*[:\s#\-]*\$?\s*([\d\.,]+)', b, re.IGNORECASE)
            if not amt_match:
                amt_match = re.search(r'\$\s*([\d\.,]+)', b)

            if trk_match or amt_match or desc_match:
                wt_val = float(wt_match.group(1).replace(',', '')) if wt_match else None
                amt_val = float(amt_match.group(1).replace(',', '')) if amt_match else None
                trk_val = trk_match.group(1).strip() if trk_match else None
                desc_val = desc_match.group(1).strip() if desc_match else "Freight Shipment"

                if amt_val is not None and amt_val > 0:
                    items.append({
                        "tracking_number": trk_val,
                        "description": desc_val,
                        "weight_kg": wt_val,
                        "charged_amount": amt_val,
                    })

    if items:
        return items

    # -------------------------------------------------------------
    # Strategy 2: Multi-line / Tracking Number boundary segmentation
    # Finds lines/tokens starting with tracking numbers (e.g. DH..., FX..., 1Z..., TRK..., MSKU..., BOL-..., etc.)
    # and extracts all content up to the next tracking number or TOTAL line.
    # -------------------------------------------------------------
    body_text = re.split(r'(?:TOTAL\s+(?:CHARGED|DUE|AMOUNT)|TOTAL\s*:\s*\$|SUBTOTAL)', text, flags=re.IGNORECASE)[0]

    # Pattern identifying tracking numbers / container numbers at token/line starts
    tracking_pattern = r'(\b[A-Za-z]{1,4}\d{5,}[A-Za-z0-9\-]*|\b1Z[A-Za-z0-9]{16}|\bTRK[A-Za-z0-9\-]+|\b[A-Za-z]{2,5}\-\d{4,})'
    
    tracking_matches = list(re.finditer(tracking_pattern, body_text))
    
    if tracking_matches:
        for idx, match in enumerate(tracking_matches):
            start_pos = match.start()
            end_pos = tracking_matches[idx + 1].start() if idx + 1 < len(tracking_matches) else len(body_text)
            chunk = body_text[start_pos:end_pos].strip()
            
            trk_number = match.group(1).strip()
            
            # Find dollar amount in chunk
            amt_match = re.search(r'\$\s*([\d\.,]+)', chunk)
            if not amt_match:
                amt_match = re.search(r'(?:^|\s)([\d,]+\.\d{2})(?:\s|$)', chunk)
            
            amt_val = float(amt_match.group(1).replace(',', '')) if amt_match else None
            
            # Skip if amount is 0, negative, or not found (e.g. payment terms / reference headers)
            if amt_val is None or amt_val <= 0:
                continue

            # Find weight in chunk (e.g. 250.0 kg, 18,000 kg, 85.5 kg, 3.0 kg, 250.0\nkg, or 250.0)
            wt_match = re.search(r'([\d\.,]+)\s*(?:kg|lbs|g)\b', chunk, re.IGNORECASE)
            if not wt_match:
                # Look for weight before amount
                wt_candidates = re.findall(r'\b(\d+(?:[,\.]\d+)?)\b', chunk)
                wt_val = None
                for cand in wt_candidates:
                    if cand not in trk_number and (not amt_match or cand not in amt_match.group(1)):
                        try:
                            val = float(cand.replace(',', ''))
                            if 0.1 <= val <= 100000:
                                wt_val = val
                                break
                        except ValueError:
                            pass
            else:
                wt_val = float(wt_match.group(1).replace(',', ''))

            # Extract description by removing tracking number, weight, amounts, and headers
            desc_chunk = chunk
            desc_chunk = desc_chunk.replace(trk_number, '', 1)
            if amt_match:
                desc_chunk = desc_chunk.replace(amt_match.group(0), '')
            if wt_match:
                desc_chunk = desc_chunk.replace(wt_match.group(0), '')
            elif wt_val is not None:
                desc_chunk = re.sub(rf'\b{wt_val}\b', '', desc_chunk)
            
            # Clean up leftover keywords/symbols
            desc_chunk = re.sub(r'\b(?:kg|lbs|g|USD|EUR|Amount|Charged|Weight|Description|Item|Rate)\b', '', desc_chunk, flags=re.IGNORECASE)
            desc_chunk = re.sub(r'[\$\|\:\_\=\#]', ' ', desc_chunk)
            desc_chunk = ' '.join(desc_chunk.split()).strip(" -:\t\r\n")
            
            if not desc_chunk:
                desc_chunk = "Freight Shipment"
            
            # Ignore payment terms or document headers
            if desc_chunk.lower() in ["payment terms", "bill of lading", "bol reference", "invoice"]:
                continue

            items.append({
                "tracking_number": trk_number,
                "description": desc_chunk,
                "weight_kg": wt_val,
                "charged_amount": amt_val
            })

    if items:
        return items

    # -------------------------------------------------------------
    # Strategy 3: Tabular line rows (for single line table formats)
    # -------------------------------------------------------------
    lines = text.splitlines()
    for line in lines:
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("#") or line_clean.startswith("---") or line_clean.startswith("==="):
            continue
        if re.search(r'^(?:TOTAL|SUBTOTAL|INVOICE|DATE|CARRIER|CLIENT|SHIPMENT DETAILS|TRACKING)', line_clean, re.IGNORECASE):
            continue
        
        amt_match = re.search(r'\$\s*([\d\.,]+)', line_clean)
        wt_match = re.search(r'([\d\.,]+)\s*(?:kg|lbs|g)?', line_clean, re.IGNORECASE)
        trk_match = re.search(r'\b([A-Za-z0-9\-]{5,})\b', line_clean)
        
        if amt_match:
            amt_val = float(amt_match.group(1).replace(',', ''))
            if amt_val <= 0:
                continue

            wt_val = float(wt_match.group(1).replace(',', '')) if wt_match else None
            trk_val = trk_match.group(1) if trk_match else None
            
            desc = line_clean
            if trk_val:
                desc = desc.replace(trk_val, '')
            desc = desc.replace(amt_match.group(0), '')
            if wt_match:
                desc = desc.replace(wt_match.group(0), '')
            desc = re.sub(r'[\|\$\:\_]', ' ', desc).strip()
            desc = ' '.join(desc.split()).strip(" -:\t\r\n") or "Freight Shipment"
            
            if desc.lower() in ["payment terms", "bill of lading", "bol reference", "invoice"]:
                continue

            items.append({
                "tracking_number": trk_val,
                "description": desc,
                "weight_kg": wt_val,
                "charged_amount": amt_val
            })

    return items


# 2. LLM Client Abstraction

EXTRACTION_SYSTEM_PROMPT = """You are an expert freight invoice auditor. Extract all actual chargeable line items from the invoice.

CRITICAL EXTRACTION RULES:
1. EXTRACT ONLY actual chargeable line items — rows with a real container/package/tracking number AND a charge amount greater than zero.
2. The invoice may contain tables where column values or descriptions wrap across multiple lines. Carefully associate each tracking number with its full description, weight in kg, and charged amount.
3. Weight values may contain commas (e.g. "18,000 kg", "24,500 kg"). Always strip commas and convert to a number: 18000, not 18 or 0. 24500, not 500 or 24.
4. DO NOT extract:
   - Invoice headers (invoice #, date, bill of lading / BOL, payment terms, client/carrier names)
   - Column headers ("CONTAINER #", "TRACKING #", "DESCRIPTION", "WEIGHT", "CHARGE", "RATE")
   - Summary rows (subtotal, total, grand total, container count, balance due)
   - Rows where charged_amount is 0, $0.00, or missing

Return ONLY rows where charged_amount > 0.

FEW-SHOT EXAMPLES:
EXAMPLE — DO NOT extract:
"MAEU2298471 | Payment Terms Net 30 Days | 30 kg | $0.00"
Reason: No real charge ($0.00), it's a document reference.

EXAMPLE — DO NOT extract:
"BOL-987654 | Bill of Lading Reference | 0 kg | $0.00"
Reason: Invoice metadata / reference, not a chargeable shipment.

EXAMPLE — EXTRACT:
"MSKU1234567 | 20ft Container - Electronics | 18,000 kg | $3,200.00"
Reason: Real container, real charge. weight_kg is 18000.0 (comma stripped).

EXAMPLE — EXTRACT:
"DH456789123 | Industrial Machinery - 2 crates | 250.0 kg | $1,875.00"
Reason: Real shipment, real charge.

RESPONSE FORMAT:
Return ONLY a JSON object with key 'line_items' (array of objects).
Each object must have:
- tracking_number: string or null
- description: string or null
- weight_kg: float or null
- charged_amount: float (must be > 0)
Do NOT include any other text or explanation."""


def sanitize_weight(val) -> float | None:
    """
    Sanitize weight value from various formats:
    - 18000 / 18000.0 -> 18000.0
    - "18,000" / "18,000 kg" / "18,000.50 lbs" -> 18000.0 / 18000.5
    - "24,500" -> 24500.0 (prevents misreading comma-separated thousands as 0 or 500)
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val >= 0 else None
    
    val_str = str(val).strip()
    if not val_str:
        return None
    
    # Remove unit words like kg, lbs, g, tons
    val_str = re.sub(r'[a-zA-Z]+', '', val_str).strip()
    # Remove commas
    val_str = val_str.replace(',', '').strip()
    
    try:
        num = float(val_str)
        return num if num >= 0 else None
    except (ValueError, TypeError):
        return None


def sanitize_amount(val) -> float | None:
    """
    Sanitize charge amount value:
    - 3200 / 3200.0 -> 3200.0
    - "$3,200.00" / "3,200.00" -> 3200.0
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val > 0 else None
    
    val_str = str(val).strip()
    if not val_str:
        return None
    
    val_str = re.sub(r'[\$\sUSD|EUR|GBP]+', '', val_str, flags=re.IGNORECASE)
    val_str = val_str.replace(',', '').strip()
    
    try:
        num = float(val_str)
        return num if num > 0 else None
    except (ValueError, TypeError):
        return None


def is_junk_or_header_row(item: dict) -> bool:
    """
    Defensive check to identify non-chargeable metadata, headers, terms, or summaries.
    """
    desc = str(item.get("description") or "").strip().lower()
    trk = str(item.get("tracking_number") or "").strip().lower()
    
    if not desc and not trk:
        return True
    
    header_keywords = [
        "payment terms", "net 30", "net 60", "net 15", "due upon receipt",
        "bill of lading", "bol reference", "b/l no", "bol no", "bol #",
        "invoice #", "invoice no", "invoice date", "invoice total",
        "subtotal", "total charged", "total due", "grand total", "balance due",
        "container count", "total containers", "total packages", "total weight",
        "description", "tracking #", "container #", "unit price", "rate per kg",
        "remit to", "bank details", "wire instructions"
    ]
    
    for kw in header_keywords:
        if desc == kw or desc.startswith(kw + ":") or desc.startswith(kw + " -"):
            return True
        if trk == kw or trk.startswith(kw + ":"):
            return True
            
    return False


def sanitize_and_filter_line_items(raw_items: list[dict]) -> list[dict]:
    """
    Defensive post-processing filter for extracted line items (LLM and parser outputs).
    Enforces positive charge (> 0), sanitizes comma weights, and eliminates metadata junk.
    """
    valid_items = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        
        amt = sanitize_amount(item.get("charged_amount"))
        if amt is None or amt <= 0:
            continue
        
        if is_junk_or_header_row(item):
            continue
        
        wt = sanitize_weight(item.get("weight_kg"))
        trk = item.get("tracking_number")
        desc = item.get("description")
        
        trk_clean = str(trk).strip() if trk else None
        desc_clean = str(desc).strip() if desc else "Freight Shipment"
        
        valid_items.append({
            "tracking_number": trk_clean,
            "description": desc_clean,
            "weight_kg": wt,
            "charged_amount": amt,
        })
        
    return valid_items


class BaseLLMClient:
    """Abstract base for LLM providers."""
    def extract_from_text(self, text: str) -> dict:
        raise NotImplementedError

    def extract_from_image(self, image_base64: str) -> dict:
        raise NotImplementedError


class GroqClient(BaseLLMClient):
    """Groq client using OpenAI-compatible API."""
    def __init__(self, api_key: str):
        from groq import Groq
        self.client = Groq(api_key=api_key)

    def extract_from_text(self, text: str) -> dict:
        candidate_models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "mixtral-8x7b-32768"
        ]
        last_err = None
        for model in candidate_models:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": EXTRACTION_SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": f"Extract all actual chargeable line items (charge > 0) from this invoice:\n\n{text}"
                        }
                    ],
                    temperature=0.0,
                    response_format={"type": "json_object"}
                )
                raw_text = response.choices[0].message.content.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                return json.loads(raw_text.strip())
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err
        raise RuntimeError("No line items could be extracted with Groq.")

    def extract_from_image(self, image_base64: str) -> dict:
        candidate_models = [
            "llama-3.2-11b-vision-preview",
            "llama-3.2-90b-vision-preview",
            "meta-llama/llama-4-scout-17b-16e-instruct"
        ]
        last_err = None
        for model in candidate_models:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": EXTRACTION_SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Extract all actual chargeable line items (charge > 0) from this invoice page."},
                                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
                            ]
                        }
                    ],
                    temperature=0.0,
                    response_format={"type": "json_object"}
                )
                raw_text = response.choices[0].message.content.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                return json.loads(raw_text.strip())
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err
        raise RuntimeError("No line items could be extracted with Groq.")


class GeminiClient(BaseLLMClient):
    """Gemini client using Google's GenAI SDK."""
    def __init__(self, api_key: str):
        from google import genai
        from google.genai import types
        self.client = genai.Client(api_key=api_key)
        self.types = types

    def extract_from_text(self, text: str) -> dict:
        config = self.types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
        )
        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                EXTRACTION_SYSTEM_PROMPT,
                text
            ],
            config=config,
        )
        raw_text = (response.text or "").strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        return json.loads(raw_text.strip())

    def extract_from_image(self, image_base64: str) -> dict:
        image_bytes = base64.b64decode(image_base64)

        config = self.types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
        )

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                self.types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                EXTRACTION_SYSTEM_PROMPT
            ],
            config=config,
        )
        raw_text = (response.text or "").strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        return json.loads(raw_text.strip())


# 3. ARQ Task – Main Extraction

async def extract_invoice_lines(ctx, invoice_id: int):
    """
    ARQ task: 
    1. Load invoice from DB.
    2. Extract digital text from PDF (or convert to image for scanned docs).
    3. Call Text/Vision LLM or deterministic parser.
    4. Validate and defensively filter items (charge > 0, sanitize weights, remove headers/junk).
    5. Store real extracted line items in DB.
    6. Update status to EXTRACTED (or ERROR if unextractable).
    """
    provider = (LLM_PROVIDER or "groq").lower()
    llm = None
    if (provider == "gemini" or not GROQ_API_KEY) and GEMINI_API_KEY:
        llm = GeminiClient(api_key=GEMINI_API_KEY)
    elif GROQ_API_KEY:
        llm = GroqClient(api_key=GROQ_API_KEY)
    elif GEMINI_API_KEY:
        llm = GeminiClient(api_key=GEMINI_API_KEY)

    db = await get_session()
    try:
        # 1. Fetch invoice from DB
        invoice = await db.get(Invoice, invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        all_line_items = []

        if not invoice.file_path:
            raise ValueError("No PDF file attached to invoice")

        pdf_path = invoice.file_path
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")

        # 2. Try digital text extraction first via pypdf
        extracted_text = ""
        if PdfReader is not None:
            try:
                reader = PdfReader(pdf_path)
                for page in reader.pages:
                    page_text = page.extract_text() or ""
                    if page_text:
                        extracted_text += page_text + "\n"
            except Exception as pdf_err:
                print(f"pypdf extraction warning for invoice {invoice_id}: {pdf_err}")

        # 3. Process extracted text if available
        if extracted_text.strip():
            # A) Try LLM text extraction first if configured
            if llm:
                try:
                    data = llm.extract_from_text(extracted_text)
                    items = data.get("line_items", [])
                    if items:
                        all_line_items.extend(items)
                except Exception as llm_err:
                    print(f"LLM text extraction failed for invoice {invoice_id}: {llm_err}. Using rule-based text parser.")

            # B) If LLM did not return items, use deterministic text parser
            if not all_line_items:
                parsed_items = extract_line_items_from_text(extracted_text)
                if parsed_items:
                    all_line_items.extend(parsed_items)

        # 4. If no text found (scanned image PDF), fallback to pdf2image + Vision LLM
        if not all_line_items and convert_from_path is not None and llm is not None:
            try:
                images = convert_from_path(pdf_path, dpi=200)
                for page_num, image in enumerate(images, start=1):
                    buffered = BytesIO()
                    image.save(buffered, format="PNG")
                    img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

                    data = llm.extract_from_image(img_base64)
                    items = data.get("line_items", [])
                    for item in items:
                        item["page"] = page_num
                    all_line_items.extend(items)
            except Exception as vision_err:
                print(f"Vision LLM extraction failed for invoice {invoice_id}: {vision_err}")

        # 5. Defensive post-processing filter (sanitizes weights, enforces charge > 0, removes junk)
        valid_items = sanitize_and_filter_line_items(all_line_items)

        # 6. Check if valid items were extracted
        if not valid_items:
            # Mark invoice as ERROR if nothing could be extracted
            invoice.status = InvoiceStatus.ERROR
            await db.commit()
            return {"status": "error", "message": "No chargeable line items (amount > 0) could be extracted from the invoice PDF"}

        # 7. Store extracted real line items in DB
        for item in valid_items:
            line = LineItem(
                invoice_id=invoice.id,
                tracking_number=item["tracking_number"],
                description=item["description"],
                weight_kg=item["weight_kg"],
                charged_amount=item["charged_amount"],
            )
            db.add(line)

        # 8. Mark as EXTRACTED
        invoice.status = InvoiceStatus.EXTRACTED
        await db.commit()
        return {"status": "success", "line_items_count": len(valid_items)}

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