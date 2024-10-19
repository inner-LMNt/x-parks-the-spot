from flask import Blueprint

bp = Blueprint("search", __name__, url_prefix="/search")

from . import routes as routes
