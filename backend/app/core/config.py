# Application configuration, loaded from environment variables.
from pydantic_settings import BaseSettings
from pydantic import ConfigDict 

class Settings(BaseSettings):
    PROJECT_NAME: str = "invoiceguard_ai"

    DATABASE_URL: str = (
        "postgresql+asyncpg://user:pass@localhost:5432/invoiceguard_ai"
    )

    REDIS_URL: str = "redis://localhost:6379/0"

    GROQ_API_KEY: str

    UPLOAD_DIR: str = "uploads" 

    model_config = ConfigDict(  
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()