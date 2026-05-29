from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from werkzeug.security import generate_password_hash

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.student import Student
    from ..utils.validators import is_valid_phone, require_fields
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.student import Student
    from utils.validators import is_valid_phone, require_fields

students_bp = Blueprint("students", __name__)


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


@students_bp.get("")
@role_required("admin", "accountant", "staff")
def list_students():
    query = request.args.get("q", "").strip()
    students = Student.query
    if query:
        like_query = f"%{query}%"
        students = students.filter(
            or_(
                Student.name.ilike(like_query),
                Student.admission_no.ilike(like_query),
                Student.class_name.ilike(like_query),
                Student.parent_phone.ilike(like_query),
            )
        )
    return jsonify({"students": [serialize_student(student) for student in students.order_by(Student.name.asc()).all()]})


@students_bp.post("")
@role_required("admin")
def create_student():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["name", "admission_no", "class_name"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400
    if payload.get("parent_phone") and not is_valid_phone(payload["parent_phone"]):
        return jsonify({"error": "validation_error", "message": "Invalid parent phone"}), 400
    if Student.query.filter_by(admission_no=payload["admission_no"]).first():
        return jsonify({"error": "conflict", "message": "Admission number already exists"}), 409

    portal_pin_hash = None
    if payload.get("portal_pin"):
        portal_pin_hash = generate_password_hash(str(payload["portal_pin"]).strip())

    student = Student(
        name=payload["name"].strip(),
        admission_no=payload["admission_no"].strip(),
        class_name=payload["class_name"].strip(),
        parent_phone=payload.get("parent_phone"),
        portal_pin_hash=portal_pin_hash,
        balance=payload.get("balance", 0),
        school_id=payload.get("school_id"),
    )
    db.session.add(student)
    db.session.commit()
    return jsonify({"student": serialize_student(student)}), 201


@students_bp.put("/<int:student_id>")
@role_required("admin")
def update_student(student_id):
    student = Student.query.get_or_404(student_id)
    payload = request.get_json(silent=True) or {}

    for field in ["name", "admission_no", "class_name", "parent_phone", "school_id"]:
        if field in payload:
            setattr(student, field, payload[field])
    if "portal_pin" in payload and payload["portal_pin"]:
        student.portal_pin_hash = generate_password_hash(str(payload["portal_pin"]).strip())
    if "balance" in payload:
        student.balance = payload["balance"]

    db.session.commit()
    return jsonify({"student": serialize_student(student)})


@students_bp.delete("/<int:student_id>")
@role_required("admin")
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "student_deleted"})
