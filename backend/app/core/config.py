# Application configuration, loaded from environment variables.
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Freight Auditor"
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/freightauditor"
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"


settings = Settings()