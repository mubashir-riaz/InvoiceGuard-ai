import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/invoiceguard_ai")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")  # "groq" or "gemini"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")