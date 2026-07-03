import base64
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from flask import current_app, has_app_context

try:
    from ..config import Config
    from ..utils.helpers import generate_reference
except ImportError:
    from config import Config
    from utils.helpers import generate_reference


NAIROBI_TZ = ZoneInfo("Africa/Nairobi")


def _setting(name, default=""):
    if has_app_context():
        value = current_app.config.get(name)
        if value is not None:
            return value
    return getattr(Config, name, default)


def _normalize_phone_number(phone_number):
    phone = str(phone_number or "").strip().replace(" ", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0") and len(phone) == 10:
        return f"254{phone[1:]}"
    if phone.startswith("254") and len(phone) == 12:
        return phone
    return phone


def _mpesa_ready():
    return all(
        [
            _setting("MPESA_CONSUMER_KEY"),
            _setting("MPESA_CONSUMER_SECRET"),
            _setting("MPESA_SHORTCODE"),
            _setting("MPESA_PASSKEY"),
            _setting("MPESA_CALLBACK_URL"),
        ]
    )


def _mpesa_base_url():
    return str(_setting("MPESA_BASE_URL", "https://sandbox.safaricom.co.ke")).rstrip("/")


def _get_access_token():
    if has_app_context() and current_app.config.get("TESTING"):
        return {"access_token": None, "mode": "mock"}

    if not _mpesa_ready():
        return {"access_token": None, "mode": "mock"}

    response = requests.get(
        f"{_mpesa_base_url()}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(_setting("MPESA_CONSUMER_KEY"), _setting("MPESA_CONSUMER_SECRET")),
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
    raw = f"{_setting('MPESA_SHORTCODE')}{_setting('MPESA_PASSKEY')}{timestamp}"
    return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


def initiate_stk_push(phone_number, amount, account_reference, description="School fee payment"):
    if has_app_context() and current_app.config.get("TESTING"):
        return {
            "success": True,
            "mode": "mock",
            "CheckoutRequestID": generate_reference("CHK"),
            "MerchantRequestID": generate_reference("MRCH"),
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Mock STK push sent",
        }

    if not _mpesa_ready():
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
    shortcode = _setting("MPESA_SHORTCODE")
    response = requests.post(
        f"{_mpesa_base_url()}/mpesa/stkpush/v1/processrequest",
        json={
            "BusinessShortCode": shortcode,
            "Password": _build_password(timestamp),
            "Timestamp": timestamp,
            "TransactionType": _setting("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"),
            "Amount": int(float(amount)),
            "PartyA": _normalize_phone_number(phone_number),
            "PartyB": shortcode,
            "PhoneNumber": _normalize_phone_number(phone_number),
            "CallBackURL": _setting("MPESA_CALLBACK_URL"),
            "AccountReference": str(account_reference),
            "TransactionDesc": description or _setting("MPESA_TRANSACTION_DESC", "account"),
        },
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
