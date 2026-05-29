from decimal import Decimal

try:
    from ..database.db import db
    from ..models.payment import Payment
    from ..models.student import Student
except ImportError:
    from database.db import db
    from models.payment import Payment
    from models.student import Student


def _extract_daraja_metadata(payload):
    body = payload.get("Body") or {}
    stk_callback = body.get("stkCallback") or {}
    callback_metadata = stk_callback.get("CallbackMetadata") or {}
    metadata_items = callback_metadata.get("Item") or []

    metadata = {}
    for item in metadata_items:
        name = item.get("Name")
        if name:
            metadata[name] = item.get("Value")

    return {
        "result_code": stk_callback.get("ResultCode", payload.get("result_code")),
        "result_desc": stk_callback.get("ResultDesc", payload.get("result_desc")),
        "checkout_request_id": stk_callback.get("CheckoutRequestID")
        or payload.get("checkout_request_id")
        or payload.get("CheckoutRequestID")
        or payload.get("reference"),
        "merchant_request_id": stk_callback.get("MerchantRequestID")
        or payload.get("merchant_request_id")
        or payload.get("MerchantRequestID"),
        "amount": metadata.get("Amount", payload.get("amount")),
        "mpesa_code": metadata.get("MpesaReceiptNumber")
        or payload.get("mpesa_code")
        or payload.get("transaction_code"),
        "phone_number": metadata.get("PhoneNumber") or payload.get("phone_number"),
        "admission_no": metadata.get("AccountReference")
        or payload.get("admission_no")
        or payload.get("account_reference"),
    }


def reconcile_payment(payload):
    daraja_meta = _extract_daraja_metadata(payload)
    mpesa_code = (
        daraja_meta["mpesa_code"]
        or payload.get("mpesa_code")
        or payload.get("transaction_code")
        or payload.get("reference")
    )
    gateway_reference = daraja_meta["checkout_request_id"] or payload.get("gateway_reference")
    amount = Decimal(str(payload.get("amount", 0) or 0))
    if daraja_meta["amount"] is not None:
        amount = Decimal(str(daraja_meta["amount"]))
    student_id = payload.get("student_id")
    admission_no = daraja_meta["admission_no"] or payload.get("admission_no") or payload.get("account_reference")
    recorded_by = payload.get("recorded_by")
    school_id = payload.get("school_id")
    result_code = daraja_meta["result_code"]
    payment_is_successful = result_code in {None, 0, "0"}

    existing_payment = None
    if gateway_reference:
        existing_payment = Payment.query.filter_by(gateway_reference=gateway_reference).first()
    if existing_payment is None and mpesa_code:
        existing_payment = Payment.query.filter_by(mpesa_code=mpesa_code).first()

    if existing_payment:
        if existing_payment.status != "pending":
            return existing_payment, "duplicate"

        existing_payment.amount = amount or existing_payment.amount
        if gateway_reference and not existing_payment.gateway_reference:
            existing_payment.gateway_reference = gateway_reference

        if payment_is_successful:
            if mpesa_code:
                existing_payment.mpesa_code = mpesa_code
            existing_payment.status = "completed"
            if existing_payment.student:
                existing_payment.student.balance = max(
                    Decimal(str(existing_payment.student.balance or 0)) - amount,
                    Decimal("0"),
                )
            db.session.commit()
            return existing_payment, "matched"

        existing_payment.status = "failed"
        db.session.commit()
        return existing_payment, "failed"

    student = None
    if student_id:
        student = Student.query.get(student_id)
    if student is None and admission_no:
        student = Student.query.filter_by(admission_no=admission_no).first()

    payment = Payment(
        student_id=student.id if student else None,
        school_id=student.school_id if student and student.school_id is not None else school_id,
        amount=amount,
        payment_method=payload.get("payment_method", "webhook"),
        gateway_reference=gateway_reference,
        mpesa_code=mpesa_code,
        status="completed" if student and payment_is_successful else ("failed" if not payment_is_successful else "unmatched"),
        recorded_by=recorded_by,
    )
    db.session.add(payment)

    if student and payment_is_successful:
        student.balance = max(Decimal(str(student.balance or 0)) - amount, Decimal("0"))

    db.session.commit()
    if student and payment_is_successful:
        return payment, "matched"
    if not payment_is_successful:
        return payment, "failed"
    return payment, "unmatched"
