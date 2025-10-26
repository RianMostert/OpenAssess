"""
Manages application configuration using Pydantic's BaseSettings.

Environment variables are loaded from a .env file and used to configure
settings like the database URL, frontend origin (for CORS), and environment type.

Default values are provided for development, but can be overridden by
setting environment variables or editing the .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"
    FRONTEND_URL: str = "*"
    ENV: str = "dev"
    
    # JWT Secret Key - MUST be set in production via environment variable
    SECRET_KEY: str = "dev-insecure-secret-change-in-production"

    JSON_STORAGE_PATH: Path = Path("storage/json/")

    QUESTION_PAPER_STORAGE_FOLDER: Path = Path("storage/pdfs/question_papers/")
    ANSWER_SHEET_STORAGE_FOLDER: Path = Path("storage/pdfs/answer_sheets/")
    ANNOTATION_STORAGE_FOLDER: Path = Path("storage/jsons/annotations/")

    model_config = ConfigDict(env_file=".env")
    
    @property
    def frontend_origins(self) -> list[str]:
        """Convert comma-separated FRONTEND_URL to list of origins for CORS"""
        if self.FRONTEND_URL == "*":
            return ["*"]
        return [url.strip() for url in self.FRONTEND_URL.split(",") if url.strip()]


settings = Settings()
