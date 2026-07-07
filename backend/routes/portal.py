from datetime import date
from decimal import Decimal

from flask import Blueprint, jsonify, request
from flask import current_app
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, get_jwt
from werkzeug.security import check_password_hash


def _is_valid_portal_pin(student, submitted_pin):
    if not student or not submitted_pin:
        return False

    stored_pin = getattr(student, "portal_pin_hash", None)
    if not stored_pin:
        return False

    if isinstance(stored_pin, str) and stored_pin.strip() == str(submitted_pin).strip():
        return True

    try:
        return check_password_hash(stored_pin, str(submitted_pin).strip())
    except Exception:
        return False

try:
    from ..database.db import db
    from ..models.academic_term import AcademicTerm
    from ..models.fee_structure import FeeStructure
    from ..models.payment import Payment
    from ..models.student import Student
    from ..services.academic_terms import get_active_term
    from ..services.billing import sync_term_billing
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
    from services.billing import sync_term_billing
    from services.mpesa import initiate_stk_push
    from services.mpesa import queue_stk_push
    from services.reconcile import reconcile_payment
    from utils.validators import is_valid_amount, require_fields

portal_bp = Blueprint("portal", __name__)


def _display_payment_method(payment_method):
    return "cash" if payment_method == "manual" else "mpesa"


def serialize_student_portal(student):
    ledger_balance = Decimal(str(student.balance or 0))
    amount_due = float(ledger_balance) if ledger_balance > 0 else 0.0
    credit = float(-ledger_balance) if ledger_balance < 0 else 0.0
    return {
        "id": student.id,
        "name": student.name,
        "admission_no": student.admission_no,
        "class_name": student.class_name,
        "parent_phone": student.parent_phone,
        "balance": amount_due,
        "credit": credit,
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

    fee_structures = FeeStructure.query.filter_by(school_id=student.school_id).all()
    fee_structures_by_term_id = {}
    fee_structures_by_name = {}
    for fee_structure in fee_structures:
        if fee_structure.academic_term_id is not None:
            fee_structures_by_term_id.setdefault(fee_structure.academic_term_id, []).append(fee_structure)
        if fee_structure.term:
            fee_structures_by_name.setdefault(fee_structure.term.strip().lower(), []).append(fee_structure)

    class_key = student.class_name.strip().lower()
    present_fee = None
    last_fee = None
    next_fee = None

    def _matches_class(fee_structure):
        if not fee_structure or not fee_structure.class_name:
            return False

        raw_class_names = fee_structure.class_name
        if isinstance(raw_class_names, str):
            raw_class_names = [part.strip() for part in raw_class_names.split(',') if part.strip()]
        elif isinstance(raw_class_names, (list, tuple, set)):
            raw_class_names = [str(item).strip() for item in raw_class_names if str(item).strip()]
        else:
            raw_class_names = [str(raw_class_names).strip()]

        normalized_targets = {name.lower() for name in raw_class_names}
        return class_key in normalized_targets

    def _pick_fee_structure_for_class(candidates):
        for candidate in candidates:
            if _matches_class(candidate):
                return candidate
        return None

    for index, academic_term in enumerate(academic_terms):
        fee_structure = None
        if academic_term.id in fee_structures_by_term_id:
            fee_structure = _pick_fee_structure_for_class(fee_structures_by_term_id[academic_term.id])
        elif academic_term.name:
            fee_structure = _pick_fee_structure_for_class(
                fee_structures_by_name.get(academic_term.name.strip().lower(), [])
            )

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

    admission_no = str(payload["admission_no"]).strip()
    student = Student.query.filter_by(admission_no=admission_no).first()
    if student is None:
        student = Student.query.filter(Student.admission_no.ilike(admission_no)).first()

    if student is None or not student.portal_pin_hash:
        return jsonify({"error": "unauthorized", "message": "Invalid credentials"}), 401
    if not _is_valid_portal_pin(student, payload["pin"]):
        return jsonify({"error": "unauthorized", "message": "Invalid credentials"}), 401

    sync_term_billing(student)

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
    sync_term_billing(student)
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
    sync_term_billing(student)
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
    sync_term_billing(student)
    payment = Payment()
    payment.student_id = student.id
    payment.school_id = student.school_id
    payment.amount = Decimal(str(payload["amount"]))
    payment.payment_method = "mpesa"
    payment.mpesa_code = None
    payment.status = "pending"
    payment.recorded_by = None
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
    expected_secret = current_app.config.get("MPESA_WEBHOOK_SECRET")
    if expected_secret:
        provided_secret = request.headers.get("X-Webhook-Secret") or request.args.get("token")
        if provided_secret != expected_secret:
            return jsonify({"error": "unauthorized", "message": "Invalid webhook credentials"}), 401

    payload = request.get_json(silent=True) or {}
    payment, status = reconcile_payment(payload)
    return jsonify({"status": status, "payment_id": payment.id, "mpesa_code": payment.mpesa_code})