from flask import Blueprint, jsonify, request

try:
    from ..services.reconcile import reconcile_payment
except ImportError:
    from services.reconcile import reconcile_payment

webhooks_bp = Blueprint("webhooks", __name__)


def _display_payment_method(payment_method):
    return "mpesa"


def _flatten_daraja_callback(payload):
    body = payload.get("Body") or {}
    stk_callback = body.get("stkCallback") or {}
    callback_metadata = stk_callback.get("CallbackMetadata") or {}
    items = callback_metadata.get("Item") or []

    metadata = {}
    for item in items:
        name = item.get("Name")
        if name:
            metadata[name] = item.get("Value")

    return {
        "gateway_reference": stk_callback.get("CheckoutRequestID"),
        "merchant_request_id": stk_callback.get("MerchantRequestID"),
        "result_code": stk_callback.get("ResultCode"),
        "result_desc": stk_callback.get("ResultDesc"),
        "mpesa_code": metadata.get("MpesaReceiptNumber"),
        "amount": metadata.get("Amount"),
        "phone_number": metadata.get("PhoneNumber"),
        "admission_no": metadata.get("AccountReference"),
        "payment_method": _display_payment_method("daraja_webhook"),
    }


@webhooks_bp.post("/daraja")
def daraja_webhook():
    payload = request.get_json(silent=True) or {}
    if "Body" in payload and "stkCallback" in (payload.get("Body") or {}):
        payload.update(_flatten_daraja_callback(payload))

    payment, status = reconcile_payment(payload)
    return jsonify(
        {
            "status": status,
            "payment_id": payment.id,
            "mpesa_code": payment.mpesa_code,
        }
    )


@webhooks_bp.post("/intasend")
def legacy_intasend_webhook():
    return daraja_webhook()
