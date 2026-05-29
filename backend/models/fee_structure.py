try:
    from ..database.db import db
except ImportError:
    from database.db import db


class FeeStructure(db.Model):
    __tablename__ = "fee_structures"

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(80), nullable=False)
    term = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True)

    school = db.relationship("School", back_populates="fee_structures", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("class_name", "term", "school_id", name="uq_fee_structure"),
    )
