from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from database.db import db
from models.user import User
from utils.validators import is_valid_email, require_fields

auth_bp = Blueprint("auth", __name__)


def serialize_user(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "school_id": user.school_id,
    }


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["name", "email", "password"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400
    if not is_valid_email(payload["email"]):
        return jsonify({"error": "validation_error", "message": "Invalid email"}), 400
    if User.query.filter_by(email=payload["email"]).first():
        return jsonify({"error": "conflict", "message": "User already exists"}), 409

    user = User(
        name=payload["name"].strip(),
        email=payload["email"].strip().lower(),
        password=generate_password_hash(payload["password"]),
        role=payload.get("role", "staff"),
        school_id=payload.get("school_id"),
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role, "school_id": user.school_id})
    return jsonify({"user": serialize_user(user), "access_token": token}), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ["email", "password"])
    if missing:
        return jsonify({"error": "validation_error", "missing": missing}), 400

    user = User.query.filter_by(email=payload["email"].strip().lower()).first()
    if not user or not check_password_hash(user.password, payload["password"]):
        return jsonify({"error": "unauthorized", "message": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role, "school_id": user.school_id})
    return jsonify({"user": serialize_user(user), "access_token": token})


@auth_bp.get("/profile")
@jwt_required()
def profile():
    user = User.query.get(int(get_jwt_identity()))
    if user is None:
        return jsonify({"error": "not_found", "message": "User not found"}), 404
    return jsonify({"user": serialize_user(user)})
