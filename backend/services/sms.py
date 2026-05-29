try:
    from ..utils.helpers import generate_reference
except ImportError:
    from utils.helpers import generate_reference


def send_receipt(phone_number, payload):
    return {"status": "queued", "type": "receipt", "phone_number": phone_number, "reference": generate_reference("SMS")}


def send_balance_reminder(phone_number, payload):
    return {"status": "queued", "type": "balance_reminder", "phone_number": phone_number}


def send_overdue_alert(phone_number, payload):
    return {"status": "queued", "type": "overdue_alert", "phone_number": phone_number}
