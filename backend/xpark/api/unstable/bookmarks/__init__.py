from flask import Blueprint

bp = Blueprint("bookmarks", __name__, url_prefix="/bookmarks")

from . import routes as routes
