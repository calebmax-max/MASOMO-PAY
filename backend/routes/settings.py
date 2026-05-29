from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt
from sqlalchemy.exc import IntegrityError

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.fee_structure import FeeStructure
    from ..models.school import School
    from ..utils.validators import require_fields
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.fee_structure import FeeStructure
    from models.school import School
    from utils.validators import require_fields

settings_bp = Blueprint("settings", __name__)


def serialize_fee_structure(fee_structure):
    return {
        "id": fee_structure.id,
        "class_name": fee_structure.class_name,
        "term": fee_structure.term,
        "amount": float(fee_structure.amount or 0),
        "school_id": fee_structure.school_id,
    }


def serialize_school(school):
    return {
        "id": school.id,
        "name": school.name,
        "phone": school.phone,
        "email": school.email,
        "address": school.address,
    }


@settings_bp.get("")
@role_required("admin", "accountant", "staff")
def get_settings():
    claims = get_jwt()
    school_id = claims.get("school_id")
    if not school_id:
        return jsonify({"error": "not_found", "message": "No school is assigned to this account"}), 404

    school = School.query.get_or_404(school_id)
    fee_structures = FeeStructure.query.filter_by(school_id=school.id).order_by(FeeStructure.class_name.asc()).all()
    return jsonify(
        {
            "school": serialize_school(school),
            "fee_structures": [serialize_fee_structure(fee_structure) for fee_structure in fee_structures],
        }
    )


@settings_bp.put("")
@role_required("admin")
def update_settings():
    claims = get_jwt()
    school_id = claims.get("school_id")
    if not school_id:
        return jsonify({"error": "not_found", "message": "No school is assigned to this account"}), 404

    school = School.query.get_or_404(school_id)
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["name"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400

    school.name = payload["name"].strip()
    school.phone = payload.get("phone")
    school.email = payload.get("email")
    school.address = payload.get("address")
    db.session.commit()

    return jsonify({"school": serialize_school(school)})


@settings_bp.put("/fee-structures/<int:fee_structure_id>")
@role_required("admin", "accountant")
def update_fee_structure(fee_structure_id):
    claims = get_jwt()
    school_id = claims.get("school_id")
    if not school_id:
        return jsonify({"error": "not_found", "message": "No school is assigned to this account"}), 404

    fee_structure = FeeStructure.query.filter_by(id=fee_structure_id, school_id=school_id).first_or_404()
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["class_name", "term", "amount"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400

    fee_structure.class_name = payload["class_name"].strip()
    fee_structure.term = payload["term"].strip()
    fee_structure.amount = payload["amount"]
    db.session.commit()

    return jsonify({"fee_structure": serialize_fee_structure(fee_structure)})


@settings_bp.post("/fee-structures")
@role_required("admin", "accountant")
def create_fee_structure():
    claims = get_jwt()
    school_id = claims.get("school_id")
    if not school_id:
        return jsonify({"error": "not_found", "message": "No school is assigned to this account"}), 404

    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["class_name", "term", "amount"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400

    fee_structure = FeeStructure(
        class_name=payload["class_name"].strip(),
        term=payload["term"].strip(),
        amount=payload["amount"],
        school_id=school_id,
    )
    db.session.add(fee_structure)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "conflict", "message": "Fee structure already exists"}), 409

    return jsonify({"fee_structure": serialize_fee_structure(fee_structure)}), 201


@settings_bp.delete("/fee-structures/<int:fee_structure_id>")
@role_required("admin", "accountant")
def delete_fee_structure(fee_structure_id):
    claims = get_jwt()
    school_id = claims.get("school_id")
    if not school_id:
        return jsonify({"error": "not_found", "message": "No school is assigned to this account"}), 404

    fee_structure = FeeStructure.query.filter_by(id=fee_structure_id, school_id=school_id).first_or_404()
    db.session.delete(fee_structure)
    db.session.commit()
    return jsonify({"message": "fee_structure_deleted"})
