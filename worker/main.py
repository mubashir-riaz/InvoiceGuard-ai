# worker/main.py
from arq.connections import RedisSettings
from config import REDIS_URL
from tasks.extraction import extract_invoice_lines
from tasks.matching import match_and_audit
from tasks.dispute import generate_dispute  

class WorkerSettings:
    functions = [extract_invoice_lines, match_and_audit, generate_dispute]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
