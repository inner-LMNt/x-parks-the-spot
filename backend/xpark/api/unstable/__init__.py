from flask import Blueprint
from .auth import bp as auth_bp
from .admin import bp as admin_bp
from .parking_spaces import bp as parking_space_bp
from .search import bp as search_bp
from .reservations import bp as reservations_bp
from .cars import bp as cars_bp
from .reports import bp as reports_bp
from xpark.middleware import CORS, RequireJSON

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

CORS(bp)
RequireJSON(bp)

bp.register_blueprint(auth_bp)
bp.register_blueprint(parking_space_bp)
bp.register_blueprint(search_bp)
bp.register_blueprint(reservations_bp)
bp.register_blueprint(cars_bp)
bp.register_blueprint(reports_bp)
bp.register_blueprint(admin_bp)
bp.register_blueprint(reports_bp)


from . import routes as routes
