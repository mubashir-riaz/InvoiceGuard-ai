# backend/Dockerfile
# Builds the FastAPI service image.
# Runs the entrypoint script that applies migrations then starts Uvicorn.
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire backend context (app/, alembic/, entrypoint.sh)
COPY . .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]