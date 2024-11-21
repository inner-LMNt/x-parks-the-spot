from flask import Blueprint

bp = Blueprint("stripe", __name__, url_prefix="/stripe")

from . import routes as routes
