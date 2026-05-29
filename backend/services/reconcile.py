from decimal import Decimal

try:
    from ..database.db import db
    from ..models.payment import Payment
    from ..models.student import Student
except ImportError:
    from database.db import db
    from models.payment import Payment
    from models.student import Student


def reconcile_payment(payload):
    mpesa_code = payload.get("mpesa_code") or payload.get("transaction_code") or payload.get("reference")
    amount = Decimal(str(payload.get("amount", 0) or 0))
    student_id = payload.get("student_id")
    admission_no = payload.get("admission_no") or payload.get("account_reference")
    recorded_by = payload.get("recorded_by")
    school_id = payload.get("school_id")

    if mpesa_code:
        existing_payment = Payment.query.filter_by(mpesa_code=mpesa_code).first()
        if existing_payment:
            return existing_payment, "duplicate"

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
        mpesa_code=mpesa_code,
        status="completed" if student else "unmatched",
        recorded_by=recorded_by,
    )
    db.session.add(payment)

    if student:
        student.balance = max(Decimal(str(student.balance or 0)) - amount, Decimal("0"))

    db.session.commit()
    return payment, "matched" if student else "unmatched"
