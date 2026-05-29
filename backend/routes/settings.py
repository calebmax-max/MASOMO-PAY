from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt

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
@role_required("admin", "accountant")
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
