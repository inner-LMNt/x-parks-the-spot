from datetime import datetime

from xpark.config import Config
from . import bp
from xpark.logic.search import search_query
from flask import request, jsonify
from result import Ok, Err
from typing import Tuple, Any
import logging


@bp.post("")
def search() -> Tuple[Any, int]:
    print(request.json)
    return (
        search_query(
            lat=request.json["latitude"],  # type: ignore
            long=request.json["longitude"],  # type: ignore
            radius_meters=request.json["radius"],  # type: ignore
        ),
        200,
    )