try:
    from ..database.db import db
except ImportError:
    from database.db import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="staff")
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True)

    school = db.relationship("School", back_populates="users", lazy=True)
    payments_recorded = db.relationship("Payment", back_populates="recorded_by_user", lazy=True)
