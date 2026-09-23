import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SAARTHI Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "saarthi-sih2026-super-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # Defaults to SQLite local db if postgres URL is not provided in env
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./saarthi.db")

    class Config:
        case_sensitive = True

settings = Settings()
