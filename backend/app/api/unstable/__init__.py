from flask import Blueprint

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

from .user import bp as user_bp
bp.register_blueprint(user_bp)

from . import routes
