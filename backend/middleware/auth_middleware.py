from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def role_required(*roles):
    def decorator(view):
        @wraps(view)
        @jwt_required()
        def wrapped(*args, **kwargs):
            claims = get_jwt()
            if roles and claims.get("role") not in roles:
                return jsonify({"error": "forbidden", "message": "Insufficient permissions"}), 403
            return view(*args, **kwargs)

        return wrapped

    return decorator
