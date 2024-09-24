from flask import Blueprint

bp = Blueprint("unstable", __name__, url_prefix="/auth")

from . import routes
