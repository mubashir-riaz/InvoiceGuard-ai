# Application configuration, loaded from environment variables.
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "invoiceguard_ai"

    DATABASE_URL: str = (
        "postgresql+asyncpg://user:pass@localhost:5432/invoiceguard_ai"
    )

    REDIS_URL: str = "redis://localhost:6379/0"

    GROQ_API_KEY: str

    UPLOAD_DIR: str = "uploads" 

    class Config:
        env_file = ".env"


settings = Settings()

