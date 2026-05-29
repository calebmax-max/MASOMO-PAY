try:
    from ..database.db import db
except ImportError:
    from database.db import db


class School(db.Model):
    __tablename__ = "schools"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    address = db.Column(db.String(255), nullable=True)

    users = db.relationship("User", back_populates="school", lazy=True)
    students = db.relationship("Student", back_populates="school", lazy=True)
    fee_structures = db.relationship("FeeStructure", back_populates="school", lazy=True)
    payments = db.relationship("Payment", back_populates="school", lazy=True)
