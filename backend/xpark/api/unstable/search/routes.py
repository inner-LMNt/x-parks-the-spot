from . import bp
from xpark.logic.search import search_query
from flask import request
from typing import Tuple, Any
from datetime import datetime


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
            start_time=datetime.fromisoformat(request.json.get("start_time")) if request.json.get("start_time") else None,  # type: ignore
            end_time=datetime.fromisoformat(request.json.get("end_time")) if request.json.get("end_time") else None,  # type: ignore
            is_taken=request.json.get("is_taken"),  # type: ignore
        ),
        200,
    )
