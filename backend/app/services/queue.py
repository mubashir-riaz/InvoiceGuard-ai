# backend/app/services/queue.py
# Provides a helper to enqueue ARQ background tasks from the FastAPI backend.
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings

_pool = None

async def get_redis_pool():
    """Return a singleton ARQ Redis connection pool."""
    global _pool
    if _pool is None:
        _pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _pool

async def enqueue_task(task_name: str, *args, **kwargs):
    """Enqueue a task to the ARQ worker."""
    pool = await get_redis_pool()
    await pool.enqueue_job(task_name, *args, **kwargs)