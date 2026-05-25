# Async SQLAlchemy engine and session for the worker to access the same PostgreSQL DB.
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from worker.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    """Return a fresh database session (not a FastAPI dependency)."""
    return AsyncSessionLocal()