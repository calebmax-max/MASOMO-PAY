from datetime import date

from flask import Blueprint, jsonify, request
from flask import current_app
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, get_jwt
from werkzeug.security import check_password_hash

try:
    from ..database.db import db
    from ..models.academic_term import AcademicTerm
    from ..models.fee_structure import FeeStructure
    from ..models.payment import Payment
    from ..models.student import Student
    from ..services.academic_terms import get_active_term
    from ..services.mpesa import initiate_stk_push
    from ..services.mpesa import queue_stk_push
    from ..services.reconcile import reconcile_payment
    from ..utils.validators import is_valid_amount, require_fields
except ImportError:
    from database.db import db
    from models.academic_term import AcademicTerm
    from models.fee_structure import FeeStructure
    from models.payment import Payment
    from models.student import Student
    from services.academic_terms import get_active_term
    from services.mpesa import initiate_stk_push
    from services.mpesa import queue_stk_push
    from services.reconcile import reconcile_payment
    from utils.validators import is_valid_amount, require_fields

portal_bp = Blueprint("portal", __name__)


def _display_payment_method(payment_method):
    return "cash" if payment_method == "manual" else "mpesa"


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


def serialize_term_fee(academic_term, fee_structure):
    return {
        "term_name": academic_term.name if academic_term else None,
        "term_id": academic_term.id if academic_term else None,
        "amount": float(fee_structure.amount or 0) if fee_structure else 0,
        "class_name": fee_structure.class_name if fee_structure else None,
        "start_date": academic_term.start_date.isoformat() if academic_term and academic_term.start_date else None,
        "end_date": academic_term.end_date.isoformat() if academic_term and academic_term.end_date else None,
    }


def get_student_term_fees(student):
    if not student or not student.school_id or not student.class_name:
        return {"present": None, "last": None, "next": None}

    academic_terms = (
        AcademicTerm.query.filter_by(school_id=student.school_id)
        .order_by(AcademicTerm.start_date.asc())
        .all()
    )
    if not academic_terms:
        return {"present": None, "last": None, "next": None}

    today = date.today()
    active_term = get_active_term(student.school_id, today)
    active_term_index = None
    if active_term:
        active_term_index = next((index for index, term in enumerate(academic_terms) if term.id == active_term.id), None)

    if active_term_index is None:
        active_term_index = next((index for index, term in enumerate(academic_terms) if term.start_date and term.end_date and term.start_date <= today <= term.end_date), None)

    if active_term_index is None:
        active_term_index = 0

    fee_structures = {
        fee_structure.academic_term_id: fee_structure
        for fee_structure in FeeStructure.query.filter_by(school_id=student.school_id).all()
        if fee_structure.academic_term_id
    }

    class_key = student.class_name.strip().lower()
    present_fee = None
    last_fee = None
    next_fee = None

    for index, academic_term in enumerate(academic_terms):
        fee_structure = None
        if academic_term.id in fee_structures:
            fee_structure = fee_structures[academic_term.id]
            if fee_structure.class_name and fee_structure.class_name.strip().lower() != class_key:
                fee_structure = None
        if index == active_term_index:
            present_fee = serialize_term_fee(academic_term, fee_structure)
        elif index == active_term_index - 1:
            last_fee = serialize_term_fee(academic_term, fee_structure)
        elif index == active_term_index + 1:
            next_fee = serialize_term_fee(academic_term, fee_structure)

    return {"present": present_fee, "last": last_fee, "next": next_fee}


def serialize_payment(payment):
    return {
        "id": payment.id,
        "student_id": payment.student_id,
        "amount": float(payment.amount or 0),
        "payment_method": _display_payment_method(payment.payment_method),
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
    term_fees = get_student_term_fees(student)
    return jsonify(
        {
            "student": serialize_student_portal(student),
            "payments": [serialize_payment(payment) for payment in payments[:10]],
            "term_fees": term_fees,
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
    payment = Payment(
        student_id=student.id,
        school_id=student.school_id,
        amount=payload["amount"],
        payment_method="mpesa",
        mpesa_code=None,
        status="pending",
        recorded_by=None,
    )
    db.session.add(payment)
    db.session.commit()

    if current_app.config.get("TESTING"):
        response = initiate_stk_push(payload["phone_number"], payload["amount"], student.admission_no)
        checkout_request_id = response.get("CheckoutRequestID") or response.get("checkout_request_id")
        if checkout_request_id:
            payment.gateway_reference = checkout_request_id
            db.session.commit()
        return jsonify({"payment": serialize_payment(payment), "mpesa": response, "message": "STK push queued"}), 202

    queue_stk_push(current_app._get_current_object(), payment.id, payload["phone_number"], payload["amount"], student.admission_no)
    return jsonify({"payment": serialize_payment(payment), "message": "STK push queued"}), 202


@portal_bp.post("/webhook/reconcile")
def reconcile_webhook():
    payload = request.get_json(silent=True) or {}
    payment, status = reconcile_payment(payload)
    return jsonify({"status": status, "payment_id": payment.id, "mpesa_code": payment.mpesa_code})
