from . import bp
from xpark.logic.search import (
    search_query,
)
from flask import request
from typing import Tuple, Any

@bp.post("")
def search() -> Tuple[Any, int]:
    return (
        search_query(
            lat=request.json["lat"],  # type: ignore
            long=request.json["long"],  # type: ignore
            radius_meters=request.json["radius"],  # type: ignore
        ),
        200,
    )