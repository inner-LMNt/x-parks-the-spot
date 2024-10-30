from . import bp
from xpark.logic.search import search_query
from flask import request
from typing import Tuple, Any


@bp.post("")
def search() -> Tuple[Any, int]:
    return (
        search_query(
            lat=request.json["latitude"],  # type: ignore
            long=request.json["longitude"],  # type: ignore
            radius_meters=request.json["radius"] * 1000,  # type: ignore
            paid_status=request.json.get("paid_status"),  # type: ignore
            min_price=request.json.get("min_price"),  # type: ignore
            max_price=request.json.get("max_price"),  # type: ignore
            start_time=request.json.get("start_time"),  # type: ignore
            end_time=request.json.get("end_time"),  # type: ignore
        ),
        200,
    )
