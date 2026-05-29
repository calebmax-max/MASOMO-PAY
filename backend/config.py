import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY") or "change-me"
    DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///masomo.db"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    if DATABASE_URL.startswith("mysql://"):
        DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)
    if DATABASE_URL.startswith("mariadb://"):
        DATABASE_URL = DATABASE_URL.replace("mariadb://", "mariadb+pymysql://", 1)
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    DARAJA_CONSUMER_KEY = os.getenv("DARAJA_CONSUMER_KEY", "")
    DARAJA_CONSUMER_SECRET = os.getenv("DARAJA_CONSUMER_SECRET", "")
    DARAJA_SHORTCODE = os.getenv("DARAJA_SHORTCODE", "")
    DARAJA_PASSKEY = os.getenv("DARAJA_PASSKEY", "")
    DARAJA_CALLBACK_URL = os.getenv("DARAJA_CALLBACK_URL", "")
    DARAJA_BASE_URL = os.getenv("DARAJA_BASE_URL", "https://sandbox.safaricom.co.ke")
    DARAJA_TRANSACTION_TYPE = os.getenv("DARAJA_TRANSACTION_TYPE", "CustomerPayBillOnline")
    DARAJA_CONFIG = {
        "consumer_key": DARAJA_CONSUMER_KEY,
        "consumer_secret": DARAJA_CONSUMER_SECRET,
        "shortcode": DARAJA_SHORTCODE,
        "passkey": DARAJA_PASSKEY,
        "callback_url": DARAJA_CALLBACK_URL,
        "base_url": DARAJA_BASE_URL,
        "transaction_type": DARAJA_TRANSACTION_TYPE,
    }
    DEBUG = (os.getenv("DEBUG") or "false").lower() in {"1", "true", "yes", "on"}
