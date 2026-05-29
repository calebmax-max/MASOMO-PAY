from uuid import uuid4

import requests

from config import Config
from utils.helpers import generate_reference


def generate_token():
    if not Config.INTASEND_PUBLIC_KEY or not Config.INTASEND_SECRET_KEY:
        return {"access_token": None, "mode": "mock"}
    return {"access_token": generate_reference("TOKEN"), "mode": "live"}


def initiate_stk_push(phone_number, amount, account_reference, description="School fee payment"):
    if not Config.INTASEND_PUBLIC_KEY or not Config.INTASEND_SECRET_KEY:
        return {
            "success": True,
            "mode": "mock",
            "checkout_request_id": generate_reference("CHK"),
            "reference": account_reference,
        }
    response = requests.post(
        "https://api.intasend.com/api/v1/payment/mpesa/stk-push/",
        json={
            "phone_number": phone_number,
            "amount": amount,
            "currency": "KES",
            "comment": description,
            "account_reference": account_reference,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def verify_payment(transaction_code):
    return {
        "transaction_code": transaction_code,
        "verified": bool(transaction_code),
        "external_id": str(uuid4()),
    }
