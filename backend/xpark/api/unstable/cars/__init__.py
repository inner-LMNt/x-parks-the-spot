from flask import Blueprint

bp = Blueprint("cars", __name__, url_prefix="/cars")

from . import routes as routes
