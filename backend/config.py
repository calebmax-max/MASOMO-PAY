import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///masomo.db")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    INTASEND_PUBLIC_KEY = os.getenv("INTASEND_PUBLIC_KEY", "")
    INTASEND_SECRET_KEY = os.getenv("INTASEND_SECRET_KEY", "")
    INTASEND_KEYS = {
        "public_key": INTASEND_PUBLIC_KEY,
        "secret_key": INTASEND_SECRET_KEY,
    }
    DEBUG = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes", "on"}
