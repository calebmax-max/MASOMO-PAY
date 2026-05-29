import re


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_PATTERN = re.compile(r"^(?:\+?254|0)?7\d{8}$")


def require_fields(payload, fields):
    missing = [field for field in fields if payload.get(field) in {None, ""}]
    return missing


def is_valid_email(email):
    return bool(email and EMAIL_PATTERN.match(email))


def is_valid_phone(phone):
    return bool(phone and PHONE_PATTERN.match(phone))


def is_valid_amount(amount):
    try:
        return float(amount) > 0
    except (TypeError, ValueError):
        return False
