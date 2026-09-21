#!/bin/bash
# 1. Run Alembic migrations to ensure database schema is up to date.
# 2. Start the FastAPI server.
set -e

echo "Waiting for PostgreSQL..."
python -c "
import asyncio, asyncpg
from app.core.config import settings

# Strip SQLAlchemy driver prefixes (e.g. postgresql+asyncpg:// -> postgresql://)
db_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')

async def wait():
    retries = 30
    while retries > 0:
        try:
            conn = await asyncpg.connect(db_url)
            await conn.close()
            print('PostgreSQL is ready.')
            return
        except Exception as e:
            print(f'Waiting for PostgreSQL at {db_url}... ({e})')
            await asyncio.sleep(2)
            retries -= 1
    raise RuntimeError(f'Could not connect to PostgreSQL after 30 attempts at {db_url}')

asyncio.run(wait())
"

echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000