from datetime import date
from decimal import Decimal

from sqlalchemy import inspect, text

try:
    from ..database.db import db
    from .academic_terms import get_active_term
    from .fees import get_fee_structure_for_term
except ImportError:
    from database.db import db
    from services.academic_terms import get_active_term
    from services.fees import get_fee_structure_for_term


def sync_term_billing(student):
    """Ensure the student's balance reflects the currently active term's fee.

    Runs on every read of the student's portal data. The first time it sees
    a term it hasn't billed yet (student.last_billed_term_id != active term),
    it adds that term's fee amount to the balance and records the term as
    billed, so the balance updates automatically the moment a new term
    becomes active -- without a manual recalculation step or a cron job.
    Safe to call repeatedly: it's a no-op once a term has already been billed.
    """
    if not student or not student.school_id:
        return student

    try:
        if not hasattr(student, "last_billed_term_id"):
            raise AttributeError("last_billed_term_id missing")
    except Exception:
        return student

    try:
        inspector = inspect(db.engine)
        if "students" in inspector.get_table_names():
            columns = {column["name"] for column in inspector.get_columns("students")}
            if "last_billed_term_id" not in columns:
                db.session.execute(text("ALTER TABLE students ADD COLUMN last_billed_term_id INTEGER NULL"))
                db.session.commit()
    except Exception:
        pass

    active_term = get_active_term(student.school_id, date.today())
    if not active_term:
        return student

    if getattr(student, "last_billed_term_id", None) == active_term.id:
        return student

    fee_structure = get_fee_structure_for_term(
        student.school_id, student.class_name, active_term
    )
    if fee_structure and fee_structure.amount:
        student.balance = Decimal(str(student.balance or 0)) + Decimal(
            str(fee_structure.amount)
        )

    student.last_billed_term_id = active_term.id
    db.session.commit()
    return student