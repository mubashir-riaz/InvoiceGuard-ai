# worker/main.py
from arq.connections import RedisSettings
from config import REDIS_URL
from tasks.extraction import extract_invoice_lines
from tasks.matching import match_and_audit

class WorkerSettings:
    functions = [extract_invoice_lines, match_and_audit]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)