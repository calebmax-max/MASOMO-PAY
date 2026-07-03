import csv
from io import BytesIO, StringIO
from zipfile import ZIP_DEFLATED, ZipFile

from flask import Blueprint, jsonify, send_file
from sqlalchemy import func

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.payment import Payment
    from ..models.student import Student
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.payment import Payment
    from models.student import Student

reports_bp = Blueprint("reports", __name__)


def _display_payment_method(payment_method):
    return "cash" if payment_method == "manual" else "mpesa"


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
    payments = Payment.query.order_by(Payment.timestamp.desc()).all()
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
    return jsonify(
        {
            "student": {
                "id": student.id,
                "name": student.name,
                "admission_no": student.admission_no,
                "class_name": student.class_name,
                "balance": float(student.balance or 0),
            },
            "payments": [
                {
                    "id": payment.id,
                    "amount": float(payment.amount or 0),
                    "payment_method": _display_payment_method(payment.payment_method),
                    "status": payment.status,
                    "timestamp": payment.timestamp.isoformat() if payment.timestamp else None,
                }
                for payment in payments
                if payment.status != "failed"
            ],
        }
    )
