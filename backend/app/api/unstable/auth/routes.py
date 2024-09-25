from . import bp
from app.logic.user import *
from flask import request
from result import Ok, Err
from app.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.post("register")
def create() -> Tuple[Any, int]:
    # If we have a keyerror (param not sent), the app returns a 400 here
    # FIXME: validate email address
    match create_user(
        name=request.json["full_name"],  # type: ignore
        password=request.json["password"],  # type: ignore
        email=request.json["email"],  # type: ignore
    ):
        case Ok(new_uuid):
            return {"access_token": create_token(new_uuid), "token_type": "Bearer"}, 201
        case Err(e):
            # Should we return 409 instead? https://stackoverflow.com/questions/3825990/http-response-code-for-post-when-resource-already-exists
            return {"err": e}, 400


@bp.post("login")
def login() -> Tuple[Any, Any]:
    match check_username_password(
        password=request.json["password"],  # type: ignore
        email=request.json["email"],  # type: ignore
    ):
        case Ok(user_id):
            return {"access_token": create_token(user_id), "token_type": "Bearer"}, 201
        case Err(e):
            return {"err": e}, 401


@bp.post("logout")
@require_logged_in_user
def logout(token: str, user_id: uuid.UUID) -> Tuple[Any, Any]:
    match expire_valid_token(token):
        case Ok(_):
            return {}, 200
        case Err(e):
            return {"err": e}, 401


# @bp.get("id")
# @require_logged_in_user
# def id(user_id):
#     print(user_id)
#     return str(user_id)
