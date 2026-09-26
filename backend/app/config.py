import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "SAARTHI Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "saarthi-sih2026-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # Defaults to SQLite local db if postgres URL is not provided in env
    DATABASE_URL: str = "sqlite:///./saarthi.db"

    # Gemini API Key & Model Configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), str(BASE_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_gemini_api_key(self, enforce: bool = True) -> str:
        """
        Retrieves GEMINI_API_KEY from settings or environment.
        Raises a clear startup/runtime error if missing or set to placeholder.
        """
        key = self.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not key or key.strip() in ("", "your-key-here", "your-gemini-api-key-here") or key.startswith("your-"):
            if enforce:
                raise RuntimeError(
                    "\n"
                    "========================================================================\n"
                    "CRITICAL ERROR: GEMINI_API_KEY is missing or unconfigured!\n"
                    "Please create a '.env' file in the root directory:\n"
                    f"  Path: {ROOT_DIR / '.env'}\n"
                    "  Content: GEMINI_API_KEY=your-actual-api-key-here\n"
                    "========================================================================"
                )
            return ""
        return key.strip()

settings = Settings()
