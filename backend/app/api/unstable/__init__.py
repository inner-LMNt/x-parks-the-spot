from flask import Blueprint

bp = Blueprint("unstable", __name__, url_prefix="/api/unstable")

from app.api.unstable import routes
