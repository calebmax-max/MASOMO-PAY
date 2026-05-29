from datetime import datetime
from uuid import uuid4


def format_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def format_currency(amount):
    return f"{float(amount):,.2f}"


def generate_reference(prefix="MAS"):
    return f"{prefix}-{uuid4().hex[:10].upper()}"
