from flask import Blueprint
from .auth import bp as auth_bp
from .parking_spaces import bp as parking_space_bp
from .search import bp as search_bp
from xpark.middleware import CORS, RequireJSON

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

CORS(bp)
RequireJSON(bp)

bp.register_blueprint(auth_bp)
bp.register_blueprint(parking_space_bp)
bp.register_blueprint(search_bp)

from . import routes as routes
