from . import bp
from xpark.logic.parkingspace import search_parking_space
from flask import request
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any


@bp.get("version")
def version() -> str:
    return "unstable"


@bp.post("search")
def search() -> Tuple[Any, int]:
    return (
        search_parking_space(
            lat=request.json["lat"],  # type: ignore
            long=request.json["long"],  # type: ignore
            radius_meters=request.json["radius"],  # type: ignore
        ),
        200,
    )
