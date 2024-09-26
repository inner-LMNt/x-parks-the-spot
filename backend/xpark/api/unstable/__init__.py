from flask import Blueprint

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

from .auth import bp as auth_bp

bp.register_blueprint(auth_bp)

from . import routes
