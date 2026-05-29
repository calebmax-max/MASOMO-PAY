from flask import current_app, jsonify
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
        current_app.logger.exception("Database request failed", exc_info=error)
        message = "Database request failed"
        if current_app.debug or current_app.testing:
            message = str(error)
        return jsonify({"error": "database_error", "message": message}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        current_app.logger.exception("Unexpected server error", exc_info=error)
        return jsonify({"error": "server_error", "message": "An unexpected error occurred"}), 500
