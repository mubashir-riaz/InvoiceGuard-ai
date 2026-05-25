# worker/main.py
from arq.connections import RedisSettings
from worker.config import REDIS_URL
from worker.tasks.extraction import extract_invoice_lines  # import the new task

# Remove the old sample_task import if present.

class WorkerSettings:
    functions = [extract_invoice_lines]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)