from . import bp
from xpark.logic.search import (
    search_query,
    search_leaderboard,
)
from flask import request
from typing import Tuple, Any
from datetime import datetime
from result import Ok, Err
import uuid



@bp.post("")
def search() -> Tuple[Any, int]:
    assert request.json
    return (
        search_query(
            lat=request.json["latitude"],
            long=request.json["longitude"],
            radius_meters=request.json["radius"] * 1000,
            is_paid=(
                request.json.get("paid_status") == "PAID"
                if request.json.get("paid_status")
                else None
            ),
            min_price=request.json.get("min_price"),
            max_price=request.json.get("max_price"),
            start_time=(
                datetime.fromisoformat(request.json.get("start_time"))
                if request.json.get("start_time")
                else None
            ),
            end_time=(
                datetime.fromisoformat(request.json.get("end_time"))
                if request.json.get("end_time")
                else None
            ),
            is_taken=request.json.get("is_taken"),
        ),
        200,
    )


@bp.get("leaderboard")
def get_leaderboard() -> Tuple[Any, int]:
    match search_leaderboard():
        case Ok(leaderboard):
            return {"leaderboard", leaderboard}, 200
        case Err(e):
            return {"err": e}, 401
