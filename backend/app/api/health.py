# Health and readiness check endpoints.
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check():
    """Liveness probe: verifies that the FastAPI application is alive."""
    return {"status": "ok", "service": "InvoiceGuard-ai-api"}

@router.get("/health/ready")
async def readiness_check(response: Response, db: AsyncSession = Depends(get_db)):
    """
    Readiness probe: verifies operational connectivity to PostgreSQL and Redis.
    Returns HTTP 200 if all dependencies are healthy, or HTTP 503 if any service fails.
    """
    checks = {
        "database": "unknown",
        "redis": "unknown",
    }
    is_healthy = True

    # 1. Check PostgreSQL connection
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {type(e).__name__}"
        is_healthy = False

    # 2. Check Redis connection
    try:
        from app.services.queue import get_redis_pool
        pool = await get_redis_pool()
        pong = await pool.ping()
        checks["redis"] = "healthy" if pong else "unhealthy: no pong received"
        if not pong:
            is_healthy = False
    except Exception as e:
        checks["redis"] = f"unhealthy: {type(e).__name__}"
        is_healthy = False

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "service": "InvoiceGuard-ai-api", "checks": checks}

    return {"status": "ok", "service": "InvoiceGuard-ai-api", "checks": checks}