# Simple health‑check endpoint to verify the API is running.
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "InvoiceGuard-ai-api"}