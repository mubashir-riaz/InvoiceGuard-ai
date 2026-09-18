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
            wt_match = re.search(r'Weight\s*[:\s]*([\d\.]+)\s*(?:kg|lbs|g)?', b, re.IGNORECASE)
            amt_match = re.search(r'(?:Charged\s*Amount|Total\s*Charged|Amount\s*Charged|Charged|Amount|Rate|Cost|Price|Total)\s*[:\s#\-]*\$?\s*([\d\.,]+)', b, re.IGNORECASE)
            if not amt_match:
                amt_match = re.search(r'\$\s*([\d\.,]+)', b)

            if trk_match or amt_match or desc_match:
                wt_val = float(wt_match.group(1)) if wt_match else None
                amt_val = float(amt_match.group(1).replace(',', '')) if amt_match else None
                trk_val = trk_match.group(1).strip() if trk_match else None
                desc_val = desc_match.group(1).strip() if desc_match else "Freight Shipment"

                if trk_val or amt_val is not None:
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
    # Finds lines/tokens starting with tracking numbers (e.g. DH..., FX..., 1Z..., TRK..., etc.)
    # and extracts all content up to the next tracking number or TOTAL line.
    # -------------------------------------------------------------
    body_text = re.split(r'(?:TOTAL\s+(?:CHARGED|DUE|AMOUNT)|TOTAL\s*:\s*\$|SUBTOTAL)', text, flags=re.IGNORECASE)[0]

    # Pattern identifying tracking numbers at token/line starts (5 to 30 alphanumeric characters with digits)
    tracking_pattern = r'([A-Za-z]{1,4}\d{5,}[A-Za-z0-9\-]*|1Z[A-Za-z0-9]{16}|TRK[A-Za-z0-9\-]+)'
    
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
            
            # Find weight in chunk (e.g. 250.0 kg, 85.5 kg, 3.0 kg, 250.0\nkg, or 250.0)
            wt_match = re.search(r'([\d\.]+)\s*(?:kg|lbs|g)\b', chunk, re.IGNORECASE)
            if not wt_match:
                # Look for weight before amount
                wt_candidates = re.findall(r'\b(\d+(?:\.\d+)?)\b', chunk)
                wt_val = None
                for cand in wt_candidates:
                    if cand not in trk_number and (not amt_match or cand not in amt_match.group(1)):
                        try:
                            val = float(cand)
                            if 0.1 <= val <= 50000:
                                wt_val = val
                                break
                        except ValueError:
                            pass
            else:
                wt_val = float(wt_match.group(1))

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
            
            items.append({
                "tracking_number": trk_number,
                "description": desc_chunk,
                "weight_kg": wt_val,
                "charged_amount": amt_val if amt_val is not None else 0.0
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
        wt_match = re.search(r'([\d\.]+)\s*(?:kg|lbs|g)?', line_clean, re.IGNORECASE)
        trk_match = re.search(r'\b([A-Za-z0-9\-]{5,})\b', line_clean)
        
        if amt_match:
            amt_val = float(amt_match.group(1).replace(',', ''))
            wt_val = float(wt_match.group(1)) if wt_match else None
            trk_val = trk_match.group(1) if trk_match else None
            
            desc = line_clean
            if trk_val:
                desc = desc.replace(trk_val, '')
            desc = desc.replace(amt_match.group(0), '')
            if wt_match:
                desc = desc.replace(wt_match.group(0), '')
            desc = re.sub(r'[\|\$\:\_]', ' ', desc).strip()
            desc = ' '.join(desc.split()).strip(" -:\t\r\n") or "Freight Shipment"
            
            items.append({
                "tracking_number": trk_val,
                "description": desc,
                "weight_kg": wt_val,
                "charged_amount": amt_val
            })

    return items


# 2. LLM Client Abstraction

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
                            "content": (
                                "You are a freight invoice auditor. Extract all line items from the invoice text. "
                                "Return ONLY a JSON object with key 'line_items' (array of objects). "
                                "Each object must have: tracking_number (string|null), description (string|null), "
                                "weight_kg (float|null), charged_amount (float|null). "
                                "Do NOT include any extra text."
                            )
                        },
                        {
                            "role": "user",
                            "content": f"Extract all line items from this invoice:\n\n{text}"
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
                (
                    "Extract every line item from this freight invoice text. "
                    "Return ONLY a JSON object with key 'line_items' (array of objects). "
                    "Each object must have: tracking_number (string or null), description (string or null), "
                    "weight_kg (float or null), charged_amount (float or null). "
                    "Use null for missing values. Do NOT include any other text."
                ),
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
                (
                    "Extract every line item from this freight invoice page. "
                    "Return ONLY a JSON object with key 'line_items' (array of objects). "
                    "Each object must have: tracking_number (string or null), description (string or null), "
                    "weight_kg (float or null), charged_amount (float or null). "
                    "Use null for missing values. Do NOT include any other text."
                )
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
    4. Store real extracted line items in DB.
    5. Update status to EXTRACTED (or ERROR if unextractable).
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

        # 5. Check if items were extracted
        if not all_line_items:
            # Mark invoice as ERROR if nothing could be extracted
            invoice.status = InvoiceStatus.ERROR
            await db.commit()
            return {"status": "error", "message": "No line items could be extracted from the invoice PDF"}

        # 6. Store extracted real line items in DB
        for item in all_line_items:
            trk = item.get("tracking_number")
            desc = item.get("description")
            wt = item.get("weight_kg")
            amt = item.get("charged_amount")

            # Clean and sanitize types
            if wt is not None:
                try:
                    wt = float(wt)
                except (ValueError, TypeError):
                    wt = None

            if amt is not None:
                try:
                    amt = float(amt)
                except (ValueError, TypeError):
                    amt = 0.0

            line = LineItem(
                invoice_id=invoice.id,
                tracking_number=str(trk).strip() if trk else None,
                description=str(desc).strip() if desc else "Freight Shipment",
                weight_kg=wt,
                charged_amount=amt,
            )
            db.add(line)

        # 7. Mark as EXTRACTED
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