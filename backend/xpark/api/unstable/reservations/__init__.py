from flask import Blueprint

bp = Blueprint("reservations", __name__, url_prefix="/reservations")

from . import routes as routes
