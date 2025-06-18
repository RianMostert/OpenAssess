"""
Manages application configuration using Pydantic's BaseSettings.

Environment variables are loaded from a .env file and used to configure
settings like the database URL, frontend origin (for CORS), and environment type.

Default values are provided for development, but can be overridden by
setting environment variables or editing the .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"
    FRONTEND_URL: str = "*"
    ENV: str = "dev"
    FILE_STORAGE_PATH: str = "storage/"

    model_config = ConfigDict(env_file=".env")


settings = Settings()
