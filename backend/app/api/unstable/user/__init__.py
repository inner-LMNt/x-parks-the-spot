from flask import Blueprint

bp = Blueprint("unstable", __name__, url_prefix="/user")

from . import routes
