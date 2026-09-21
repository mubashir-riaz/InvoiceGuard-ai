# worker/Dockerfile
# Phase 2: Install poppler-utils for pdf2image.
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pdf2image
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the whole worker code (tasks, config, etc.)
COPY . .

ENV PYTHONPATH=/app

# Default command
CMD ["arq", "main.WorkerSettings"]