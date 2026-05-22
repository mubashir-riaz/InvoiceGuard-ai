#!/bin/bash
# backend/entrypoint.sh
# 1. Run Alembic migrations to ensure database schema is up to date.
# 2. Start the FastAPI server.
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000