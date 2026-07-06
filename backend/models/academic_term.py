try:
    from ..database.db import db
except ImportError:
    from database.db import db


class AcademicTerm(db.Model):
    __tablename__ = 'academic_terms'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)

    school = db.relationship('School', back_populates='academic_terms', lazy=True)
    fee_structures = db.relationship('FeeStructure', back_populates='academic_term', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('name', 'school_id', name='uq_academic_term'),
    )
