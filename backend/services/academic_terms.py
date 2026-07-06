from datetime import date, datetime
from decimal import Decimal

try:
    from ..database.db import db
    from ..models.academic_term import AcademicTerm
    from ..models.fee_structure import FeeStructure
    from ..models.student import Student
except ImportError:
    from database.db import db
    from models.academic_term import AcademicTerm
    from models.fee_structure import FeeStructure
    from models.student import Student


def parse_iso_date(value):
    if isinstance(value, date):
        return value
    if value in (None, ''):
        raise ValueError('Date is required')
    if isinstance(value, datetime):
        return value.date()
    if hasattr(value, 'date'):
        return value.date()
    return datetime.strptime(str(value), '%Y-%m-%d').date()


def get_active_term(school_id, reference_date=None):
    on_date = reference_date or date.today()
    if not school_id:
        return None

    return (
        AcademicTerm.query.filter_by(school_id=school_id)
        .filter(AcademicTerm.start_date <= on_date, AcademicTerm.end_date >= on_date)
        .order_by(AcademicTerm.start_date.desc())
        .first()
    )


def apply_term_fees_for_school(school_id, academic_term=None):
    if not school_id:
        return []

    active_term = academic_term or get_active_term(school_id)
    if not active_term:
        return []

    fee_structures = (
        FeeStructure.query.filter_by(school_id=school_id, academic_term_id=active_term.id)
        .all()
    )
    if not fee_structures:
        return []

    fee_structure_by_class = {fee_structure.class_name.strip().lower(): fee_structure for fee_structure in fee_structures if fee_structure.class_name}
    students = Student.query.filter_by(school_id=school_id).all()
    updated_students = []

    for student in students:
        if not student.class_name:
            continue

        fee_structure = fee_structure_by_class.get(student.class_name.strip().lower())
        if not fee_structure:
            continue

        current_balance = Decimal(str(student.balance or 0))
        term_amount = Decimal(str(fee_structure.amount or 0))
        if current_balance <= 0:
            student.balance = term_amount
        else:
            student.balance = current_balance + term_amount
        updated_students.append(student)

    db.session.commit()
    return updated_students
