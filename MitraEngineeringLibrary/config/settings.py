"""MEKB Configuration Settings"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Mitra Engineering Knowledge Base"
    VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = "sqlite:///D:/MitraEngineeringLibrary/database/mekb.sqlite"

    # Source data paths
    SOURCE_DIR: Path = Path("D:/Mitra3.0/temp data")

    # Export paths
    EXPORT_DIR: Path = Path("D:/MitraEngineeringLibrary/exports")
    LOG_DIR: Path = Path("D:/MitraEngineeringLibrary/logs")

    # Project prefixes
    PROJECT_PREFIXES: list[str] = ["BM", "IM", "IBM", "PD", "E", "O", "CMB", "F", "S"]

    # Import settings
    BATCH_SIZE: int = 500
    MAX_REVISIONS: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
