from flask import Blueprint

bp = Blueprint("parking-spaces", __name__, url_prefix="/parking-spaces")

from . import routes as routes
