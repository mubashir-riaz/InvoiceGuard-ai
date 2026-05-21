# Builds the ARQ worker image.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all worker code
COPY . .

# Default command (overridden by docker-compose for --watch)
CMD ["arq", "worker_app.main.WorkerSettings"]