from flask import Blueprint, jsonify, request

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.student import Student
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.student import Student

students_bp = Blueprint("students", __name__)


@students_bp.post("")
@role_required("admin", "accountant", "staff")
def create_student():
    payload = request.get_json(silent=True) or {}
    required = ["name", "admission_no", "class_name"]
    for field in required:
        if not payload.get(field):
            return jsonify({"error": "validation_error", "message": f"Missing {field}"}), 400

    existing = Student.query.filter_by(admission_no=payload["admission_no"]).first()
    if existing:
        return jsonify({"error": "conflict", "message": "Student already exists"}), 409

    student = Student(
        name=payload["name"].strip(),
        admission_no=payload["admission_no"].strip(),
        class_name=payload["class_name"].strip(),
        parent_phone=payload.get("parent_phone"),
        balance=payload.get("balance", 0),
        school_id=payload.get("school_id"),
    )
    if payload.get("portal_pin"):
        student.portal_pin_hash = student.portal_pin_hash

    if payload.get("portal_pin"):
        from werkzeug.security import generate_password_hash

        student.portal_pin_hash = generate_password_hash(str(payload["portal_pin"]))

    db.session.add(student)
    db.session.commit()
    return jsonify({"student": serialize_student(student)}), 201


@students_bp.get("")
@role_required("admin", "accountant", "staff")
def list_students():
    students = Student.query.order_by(Student.name.asc()).all()
    return jsonify({"students": [serialize_student(student) for student in students]})


@students_bp.get("/<int:student_id>")
@role_required("admin", "accountant", "staff")
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify({"student": serialize_student(student)})


@students_bp.put("/<int:student_id>")
@role_required("admin", "accountant", "staff")
def update_student(student_id):
    payload = request.get_json(silent=True) or {}
    student = Student.query.get_or_404(student_id)
    for field in ["name", "admission_no", "class_name", "parent_phone", "balance", "school_id"]:
        if field in payload:
            setattr(student, field, payload[field])
    db.session.commit()
    return jsonify({"student": serialize_student(student)})


@students_bp.delete("/<int:student_id>")
@role_required("admin", "accountant", "staff")
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student deleted"})


def serialize_student(student):
    return {
        "id": student.id,
        "name": student.name,
        "admission_no": student.admission_no,
        "class_name": student.class_name,
        "parent_phone": student.parent_phone,
        "balance": float(student.balance or 0),
        "school_id": student.school_id,
    }


__all__ = ["students_bp", "Student"]