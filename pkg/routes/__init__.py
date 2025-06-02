from flask import Blueprint
from pkg.routes.auth import auth_bp
from pkg.routes.dashboard import dashboard_bp
from pkg.routes.main import main_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(main_bp)
