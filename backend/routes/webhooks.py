from flask import Blueprint, jsonify, request

from services.mpesa import verify_payment
from services.reconcile import reconcile_payment

webhooks_bp = Blueprint("webhooks", __name__)


@webhooks_bp.post("/intasend")
def intasend_webhook():
    payload = request.get_json(silent=True) or {}
    verification = verify_payment(payload.get("transaction_code"))
    if not verification.get("verified"):
        return jsonify({"error": "validation_error", "message": "Invalid transaction"}), 400
    payload.update(verification)
    payment, status = reconcile_payment(payload)
    return jsonify(
        {
            "status": status,
            "payment_id": payment.id,
            "mpesa_code": payment.mpesa_code,
        }
    )
