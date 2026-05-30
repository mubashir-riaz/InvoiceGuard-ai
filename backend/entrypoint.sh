#!/bin/bash
# 1. Run Alembic migrations to ensure database schema is up to date.
# 2. Start the FastAPI server.
set -e

echo "Waiting for PostgreSQL..."
python -c "
import asyncio, asyncpg
async def wait():
    while True:
        try:
            conn = await asyncpg.connect('postgresql://user:pass@db:5432/invoiceguard_ai')
            await conn.close()
            break
        except:
            await asyncio.sleep(2)
asyncio.run(wait())
"

echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000