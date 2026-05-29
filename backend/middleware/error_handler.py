from flask import jsonify
from sqlalchemy.exc import SQLAlchemyError


def register_error_handlers(app):
    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "not_found", "message": "Resource not found"}), 404

    @app.errorhandler(400)
    def handle_bad_request(error):
        message = getattr(error, "description", "Bad request")
        return jsonify({"error": "bad_request", "message": message}), 400

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        return jsonify({"error": "database_error", "message": "Database request failed"}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        return jsonify({"error": "server_error", "message": "An unexpected error occurred"}), 500
