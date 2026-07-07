try:
    from ..database.db import db
except ImportError:
    from database.db import db


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    admission_no = db.Column(db.String(80), unique=True, nullable=False, index=True)
    class_name = db.Column(db.String(80), nullable=False)
    parent_phone = db.Column(db.String(20), nullable=True)
    portal_pin_hash = db.Column(db.String(255), nullable=True)
    balance = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True)
    last_billed_term_id = db.Column(
        db.Integer, db.ForeignKey("academic_terms.id"), nullable=True
    )

    school = db.relationship("School", back_populates="students", lazy=True)
    payments = db.relationship("Payment", back_populates="student", lazy=True)
