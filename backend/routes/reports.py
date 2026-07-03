from flask import Blueprint, jsonify
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
