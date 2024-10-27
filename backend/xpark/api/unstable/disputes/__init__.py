from flask import Blueprint

bp = Blueprint("disputes", __name__, url_prefix="/disputes")

from . import routes as routes
