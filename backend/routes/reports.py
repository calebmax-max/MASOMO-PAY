import csv
from datetime import date
from io import BytesIO, StringIO
from zipfile import ZIP_DEFLATED, ZipFile

from flask import Blueprint, jsonify, send_file
from sqlalchemy import func

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.academic_term import AcademicTerm
    from ..models.fee_structure import FeeStructure
    from ..models.payment import Payment
    from ..models.student import Student
    from ..services.academic_terms import get_active_term
    from ..services.receipts import generate_statement_pdf
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.academic_term import AcademicTerm
    from models.fee_structure import FeeStructure
    from models.payment import Payment
    from models.student import Student
    from services.academic_terms import get_active_term
    from services.receipts import generate_statement_pdf

reports_bp = Blueprint("reports", __name__)


def _display_payment_method(payment_method):
    return "cash" if payment_method == "manual" else "mpesa"


def _serialize_term_fee(academic_term, fee_structure):
    return {
        "term_name": academic_term.name if academic_term else None,
        "term_id": academic_term.id if academic_term else None,
        "amount": float(fee_structure.amount or 0) if fee_structure else 0,
        "class_name": fee_structure.class_name if fee_structure else None,
        "start_date": academic_term.start_date.isoformat() if academic_term and academic_term.start_date else None,
        "end_date": academic_term.end_date.isoformat() if academic_term and academic_term.end_date else None,
    }


def _get_student_term_fees(student):
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
            fee_structures_by_term_id[fee_structure.academic_term_id] = fee_structure
        if fee_structure.term:
            fee_structures_by_name[fee_structure.term.strip().lower()] = fee_structure

    class_key = student.class_name.strip().lower()

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

    present_fee = None
    last_fee = None
    next_fee = None

    for index, academic_term in enumerate(academic_terms):
        fee_structure = None
        if academic_term.id in fee_structures_by_term_id:
            fee_structure = fee_structures_by_term_id[academic_term.id]
        elif academic_term.name:
            fee_structure = fee_structures_by_name.get(academic_term.name.strip().lower())

        if fee_structure and not _matches_class(fee_structure):
            fee_structure = None

        if index == active_term_index:
            present_fee = _serialize_term_fee(academic_term, fee_structure)
        elif index == active_term_index - 1:
            last_fee = _serialize_term_fee(academic_term, fee_structure)
        elif index == active_term_index + 1:
            next_fee = _serialize_term_fee(academic_term, fee_structure)

    return {"present": present_fee, "last": last_fee, "next": next_fee}


@reports_bp.get("/summary")
@role_required("admin", "accountant")
def summary():
    total_students = db.session.query(func.count(Student.id)).scalar() or 0
    total_collections = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar() or 0
    total_balances = db.session.query(func.coalesce(func.sum(Student.balance), 0)).scalar() or 0
    return jsonify(
        {
            "total_students": total_students,
            "total_collections": float(total_collections),
            "total_balances": float(total_balances),
        }
    )


def _student_rows():
    students = Student.query.order_by(Student.name.asc()).all()
    rows = []
    for student in students:
        rows.append(
            {
                "id": student.id,
                "name": student.name,
                "admission_no": student.admission_no,
                "class_name": student.class_name,
                "parent_phone": student.parent_phone or "",
                "balance": float(student.balance or 0),
                "school_id": student.school_id or "",
            }
        )
    return rows


def _payment_rows():
    payments = Payment.query.filter(Payment.status == "completed").order_by(Payment.timestamp.desc()).all()
    rows = []
    for payment in payments:
        rows.append(
            {
                "id": payment.id,
                "student_id": payment.student_id or "",
                "student_name": payment.student.name if payment.student else "",
                "student_admission_no": payment.student.admission_no if payment.student else "",
                "amount": float(payment.amount or 0),
                "payment_method": _display_payment_method(payment.payment_method),
                "mpesa_code": payment.mpesa_code or "",
                "status": payment.status,
                "timestamp": payment.timestamp.isoformat() if payment.timestamp else "",
                "recorded_by": payment.recorded_by or "",
            }
        )
    return rows


def _rows_to_csv(rows, fieldnames):
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buffer.getvalue()


@reports_bp.get("/download")
@role_required("admin", "accountant")
def download_bundle():
    summary_data = {
        "total_students": db.session.query(func.count(Student.id)).scalar() or 0,
        "total_collections": float(
            db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar()
            or 0
        ),
        "total_balances": float(db.session.query(func.coalesce(func.sum(Student.balance), 0)).scalar() or 0),
    }

    summary_csv = _rows_to_csv(
        [{"metric": key, "value": value} for key, value in summary_data.items()],
        ["metric", "value"],
    )
    students_csv = _rows_to_csv(
        _student_rows(),
        ["id", "name", "admission_no", "class_name", "parent_phone", "balance", "school_id"],
    )
    payments_csv = _rows_to_csv(
        _payment_rows(),
        ["id", "student_id", "student_name", "student_admission_no", "amount", "payment_method", "mpesa_code", "status", "timestamp", "recorded_by"],
    )

    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("summary.csv", summary_csv)
        archive.writestr("students.csv", students_csv)
        archive.writestr("payments.csv", payments_csv)

    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name="masomo-report-bundle.zip",
    )


@reports_bp.get("/student/<int:student_id>")
@role_required("admin", "accountant", "staff")
def student_report(student_id):
    student = Student.query.get_or_404(student_id)
    payments = Payment.query.filter_by(student_id=student.id).order_by(Payment.timestamp.desc()).all()
    term_fees = _get_student_term_fees(student)
    return jsonify(
        {
            "student": {
                "id": student.id,
                "name": student.name,
                "admission_no": student.admission_no,
                "class_name": student.class_name,
                "balance": float(student.balance or 0),
            },
            "term_fees": term_fees,
            "payments": [
                {
                    "id": payment.id,
                    "amount": float(payment.amount or 0),
                    "payment_method": _display_payment_method(payment.payment_method),
                    "status": payment.status,
                    "timestamp": payment.timestamp.isoformat() if payment.timestamp else None,
                }
                for payment in payments
                if payment.status == "completed"
            ],
        }
    )


@reports_bp.get("/student/<int:student_id>/download")
@role_required("admin", "accountant", "staff")
def download_student_report(student_id):
    student = Student.query.get_or_404(student_id)
    payments = (
        Payment.query.filter_by(student_id=student.id)
        .filter(Payment.status == "completed")
        .order_by(Payment.timestamp.desc())
        .all()
    )
    pdf_bytes = generate_statement_pdf(student, payments)
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{student.admission_no or student.id}-record.pdf",
    )