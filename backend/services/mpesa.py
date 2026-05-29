import base64
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

try:
    from ..config import Config
    from ..utils.helpers import generate_reference
except ImportError:
    from config import Config
    from utils.helpers import generate_reference


NAIROBI_TZ = ZoneInfo("Africa/Nairobi")


def _normalize_phone_number(phone_number):
    phone = str(phone_number or "").strip().replace(" ", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0") and len(phone) == 10:
        return f"254{phone[1:]}"
    if phone.startswith("254") and len(phone) == 12:
        return phone
    return phone


def _daraja_ready():
    return all(
        [
            Config.DARAJA_CONSUMER_KEY,
            Config.DARAJA_CONSUMER_SECRET,
            Config.DARAJA_SHORTCODE,
            Config.DARAJA_PASSKEY,
            Config.DARAJA_CALLBACK_URL,
        ]
    )


def _daraja_base_url():
    return Config.DARAJA_BASE_URL.rstrip("/")


def _get_access_token():
    if not _daraja_ready():
        return {"access_token": None, "mode": "mock"}

    response = requests.get(
        f"{_daraja_base_url()}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(Config.DARAJA_CONSUMER_KEY, Config.DARAJA_CONSUMER_SECRET),
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return {
        "access_token": data.get("access_token"),
        "mode": "live",
    }


def generate_token():
    return _get_access_token()


def _build_password(timestamp):
    raw = f"{Config.DARAJA_SHORTCODE}{Config.DARAJA_PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


def initiate_stk_push(phone_number, amount, account_reference, description="School fee payment"):
    if not _daraja_ready():
        return {
            "success": True,
            "mode": "mock",
            "CheckoutRequestID": generate_reference("CHK"),
            "MerchantRequestID": generate_reference("MRCH"),
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Mock STK push sent",
        }

    token_data = _get_access_token()
    access_token = token_data.get("access_token")
    if not access_token:
        raise RuntimeError("Could not obtain Daraja access token")

    timestamp = datetime.now(NAIROBI_TZ).strftime("%Y%m%d%H%M%S")
    response = requests.post(
        f"{_daraja_base_url()}/mpesa/stkpush/v1/processrequest",
        json={
            "BusinessShortCode": Config.DARAJA_SHORTCODE,
            "Password": _build_password(timestamp),
            "Timestamp": timestamp,
            "TransactionType": Config.DARAJA_TRANSACTION_TYPE,
            "Amount": int(float(amount)),
            "PartyA": _normalize_phone_number(phone_number),
            "PartyB": Config.DARAJA_SHORTCODE,
            "PhoneNumber": _normalize_phone_number(phone_number),
            "CallBackURL": Config.DARAJA_CALLBACK_URL,
            "AccountReference": str(account_reference),
            "TransactionDesc": description,
        },
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
