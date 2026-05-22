# backend/app/core/database.py
# Creates async SQLAlchemy engine and provides a FastAPI dependency
# that yields a database session per request.
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:  # type: ignore
    """FastAPI dependency that provides an async database session."""
    async with AsyncSessionLocal() as session:
        yield session