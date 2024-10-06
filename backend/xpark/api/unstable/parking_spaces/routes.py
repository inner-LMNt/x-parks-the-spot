from . import bp
from xpark.logic.parkingspace import create_parking_space
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.post("/")
@require_logged_in_user
def create(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match create_parking_space(
        lat=request.json["lat"],  # type: ignore
        long=request.json["long"],  # type: ignore
        owner=user_id,
    ):
        case Ok(_):
            return {}, 201
        case Err(_):
            return {}, 500
