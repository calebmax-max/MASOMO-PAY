from datetime import datetime

from database.db import db


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    mpesa_code = db.Column(db.String(120), unique=True, nullable=True, index=True)
    status = db.Column(db.String(50), nullable=False, default="pending")
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    recorded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    student = db.relationship("Student", back_populates="payments", lazy=True)
    school = db.relationship("School", back_populates="payments", lazy=True)
    recorded_by_user = db.relationship("User", back_populates="payments_recorded", lazy=True)
