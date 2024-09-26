from flask import Blueprint
from . import routes as routes
from .auth import bp as auth_bp

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

bp.register_blueprint(auth_bp)
