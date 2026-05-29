from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.payment import Payment
    from ..models.student import Student
    from ..services.mpesa import initiate_stk_push
    from ..services.reconcile import reconcile_payment
    from ..utils.validators import is_valid_amount, require_fields
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.payment import Payment
    from models.student import Student
    from services.mpesa import initiate_stk_push
    from services.reconcile import reconcile_payment
    from utils.validators import is_valid_amount, require_fields

payments_bp = Blueprint("payments", __name__)


def serialize_payment(payment):
    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "student_name": payment.student.name if payment.student else None,
        "student_admission_no": payment.student.admission_no if payment.student else None,
        "amount": float(payment.amount or 0),
        "payment_method": payment.payment_method,
        "mpesa_code": payment.mpesa_code,
        "status": payment.status,
        "timestamp": payment.timestamp.isoformat() if payment.timestamp else None,
        "recorded_by": payment.recorded_by,
    }


@payments_bp.get("")
@role_required("admin", "accountant", "staff")
def list_payments():
    student_id = request.args.get("student_id")
    payments = Payment.query
    if student_id:
        payments = payments.filter_by(student_id=student_id)
    return jsonify({"payments": [serialize_payment(payment) for payment in payments.order_by(Payment.timestamp.desc()).all()]})


@payments_bp.post("/manual")
@role_required("admin", "accountant")
def manual_payment():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["student_id", "amount"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400
    if not is_valid_amount(payload["amount"]):
        return jsonify({"error": "validation_error", "message": "Invalid amount"}), 400

    student = Student.query.get_or_404(payload["student_id"])
    payment, status = reconcile_payment(
        {
            "student_id": student.id,
            "amount": payload["amount"],
            "payment_method": payload.get("payment_method", "manual"),
            "mpesa_code": payload.get("mpesa_code"),
            "recorded_by": int(get_jwt_identity()),
            "admission_no": student.admission_no,
            "school_id": student.school_id,
        }
    )
    return jsonify({"payment": serialize_payment(payment), "status": status}), 201


@payments_bp.post("/stkpush")
@role_required("admin", "accountant")
def stk_push():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["student_id", "amount", "phone_number"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400
    if not is_valid_amount(payload["amount"]):
        return jsonify({"error": "validation_error", "message": "Invalid amount"}), 400

    student = Student.query.get_or_404(payload["student_id"])
    response = initiate_stk_push(payload["phone_number"], payload["amount"], student.admission_no)
    payment = Payment(
        student_id=student.id,
        school_id=student.school_id,
        amount=payload["amount"],
        payment_method="stkpush",
        mpesa_code=response.get("checkout_request_id") or response.get("reference"),
        status="pending",
        recorded_by=int(get_jwt_identity()),
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({"payment": serialize_payment(payment), "mpesa": response}), 202
