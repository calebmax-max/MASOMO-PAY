from flask import Blueprint, jsonify

from middleware.auth_middleware import role_required
from models.payment import Payment
from models.student import Student

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/summary")
@role_required("admin", "accountant")
def summary():
    total_students = Student.query.count()
    total_collections = sum(float(payment.amount or 0) for payment in Payment.query.filter_by(status="completed").all())
    total_balances = sum(float(student.balance or 0) for student in Student.query.all())
    return jsonify(
        {
            "total_students": total_students,
            "total_collections": total_collections,
            "total_balances": total_balances,
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
                    "payment_method": payment.payment_method,
                    "status": payment.status,
                    "timestamp": payment.timestamp.isoformat() if payment.timestamp else None,
                }
                for payment in payments
            ],
        }
    )
