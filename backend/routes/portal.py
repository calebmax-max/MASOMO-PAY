from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, get_jwt
from werkzeug.security import check_password_hash

try:
    from ..database.db import db
    from ..models.payment import Payment
    from ..models.student import Student
    from ..services.mpesa import initiate_stk_push
    from ..services.reconcile import reconcile_payment
    from ..utils.validators import is_valid_amount, require_fields
except ImportError:
    from database.db import db
    from models.payment import Payment
    from models.student import Student
    from services.mpesa import initiate_stk_push
    from services.reconcile import reconcile_payment
    from utils.validators import is_valid_amount, require_fields

portal_bp = Blueprint("portal", __name__)


def serialize_student_portal(student):
    return {
        "id": student.id,
        "name": student.name,
        "admission_no": student.admission_no,
        "class_name": student.class_name,
        "parent_phone": student.parent_phone,
        "balance": float(student.balance or 0),
        "school_id": student.school_id,
    }


def serialize_payment(payment):
    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "amount": float(payment.amount or 0),
        "payment_method": payment.payment_method,
        "mpesa_code": payment.mpesa_code,
        "status": payment.status,
        "timestamp": payment.timestamp.isoformat() if payment.timestamp else None,
    }


def portal_identity():
    return int(get_jwt_identity())


@portal_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["admission_no", "pin"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400

    student = Student.query.filter_by(admission_no=payload["admission_no"].strip()).first()
    if student is None or not student.portal_pin_hash:
        return jsonify({"error": "unauthorized", "message": "Invalid credentials"}), 401
    if not check_password_hash(student.portal_pin_hash, str(payload["pin"]).strip()):
        return jsonify({"error": "unauthorized", "message": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(student.id),
        additional_claims={
            "role": "student",
            "student_id": student.id,
            "school_id": student.school_id,
        },
    )
    return jsonify({"student": serialize_student_portal(student), "access_token": token})


@portal_bp.get("/profile")
@jwt_required()
def profile():
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "forbidden", "message": "Student access required"}), 403

    student = Student.query.get_or_404(portal_identity())
    payments = Payment.query.filter_by(student_id=student.id).order_by(Payment.timestamp.desc()).all()
    return jsonify(
        {
            "student": serialize_student_portal(student),
            "payments": [serialize_payment(payment) for payment in payments[:10]],
        }
    )


@portal_bp.get("/payments")
@jwt_required()
def list_payments():
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "forbidden", "message": "Student access required"}), 403

    student = Student.query.get_or_404(portal_identity())
    payments = Payment.query.filter_by(student_id=student.id).order_by(Payment.timestamp.desc()).all()
    return jsonify({"payments": [serialize_payment(payment) for payment in payments]})


@portal_bp.post("/payments/stkpush")
@jwt_required()
def pay_fees():
    claims = get_jwt()
    if claims.get("role") != "student":
        return jsonify({"error": "forbidden", "message": "Student access required"}), 403

    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["amount", "phone_number"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400
    if not is_valid_amount(payload["amount"]):
        return jsonify({"error": "validation_error", "message": "Invalid amount"}), 400

    student = Student.query.get_or_404(portal_identity())
    response = initiate_stk_push(payload["phone_number"], payload["amount"], student.admission_no)
    checkout_request_id = response.get("CheckoutRequestID") or response.get("checkout_request_id")
    payment = Payment(
        student_id=student.id,
        school_id=student.school_id,
        amount=payload["amount"],
        payment_method="portal_daraja_stkpush",
        gateway_reference=checkout_request_id,
        mpesa_code=None,
        status="pending",
        recorded_by=None,
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify({"payment": serialize_payment(payment), "mpesa": response}), 202


@portal_bp.post("/webhook/reconcile")
def reconcile_webhook():
    payload = request.get_json(silent=True) or {}
    payment, status = reconcile_payment(payload)
    return jsonify({"status": status, "payment_id": payment.id, "mpesa_code": payment.mpesa_code})
