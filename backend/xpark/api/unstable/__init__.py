from flask import Blueprint
from .auth import bp as auth_bp
from xpark.middleware import CORS, RequireJSON

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

CORS(bp)
RequireJSON(bp)

bp.register_blueprint(auth_bp)

from . import routes as routes
