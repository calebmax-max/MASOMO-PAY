from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

try:
    from .config import Config
    from .database.db import db
    from .database.seed import seed_demo_data
    from .middleware.error_handler import register_error_handlers
    from .routes.auth import auth_bp
    from .routes.payments import payments_bp
    from .routes.reports import reports_bp
    from .routes.settings import settings_bp
    from .routes.students import students_bp
    from .routes.webhooks import webhooks_bp
except ImportError:
    from config import Config
    from database.db import db
    from database.seed import seed_demo_data
    from middleware.error_handler import register_error_handlers
    from routes.auth import auth_bp
    from routes.payments import payments_bp
    from routes.reports import reports_bp
    from routes.settings import settings_bp
    from routes.students import students_bp
    from routes.webhooks import webhooks_bp

jwt = JWTManager()
migrate = Migrate()


def bootstrap_database(app):
    if app.config.get("TESTING") or app.config.get("DATABASE_BOOTSTRAPPED"):
        return

    with app.app_context():
        db.create_all()
        if app.config.get("SEED_DEMO_DATA", True):
            seed_demo_data()

    app.config["DATABASE_BOOTSTRAPPED"] = True


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    register_error_handlers(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(students_bp, url_prefix="/api/students")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(webhooks_bp, url_prefix="/api/webhooks")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.cli.command("seed-db")
    def seed_db_command():
        """Seed demo data into the database."""
        result = seed_demo_data()
        print(result)

    @app.cli.command("init-db")
    def init_db_command():
        """Create all tables in the configured database."""
        with app.app_context():
            db.create_all()
        print("Database tables created")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
