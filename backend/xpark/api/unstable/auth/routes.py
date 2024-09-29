from . import bp
from xpark.logic.user import (
    expire_valid_token,
    create_token,
    create_user,
    check_username_password,
)
from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
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
            return {"access_token": create_token(new_uuid)}, 201
        case Err(e):
            return {"err": e}, 409


@bp.post("login")
def login() -> Tuple[Any, Any]:
    match check_username_password(
        password=request.json["password"],  # type: ignore
        email=request.json["email"],  # type: ignore
    ):
        case Ok(user_id):
            return {"access_token": create_token(user_id)}, 201
        case Err(e):
            return {"err": e}, 401


@bp.post("logout")
@require_logged_in_user
def logout(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    # We know that the token is valid because the require_logged_in_user decorator validated it
    # We could get away with not checking
    match expire_valid_token(token):
        case Ok(_):
            return {}, 200
        case Err(e):
            return {"err": e}, 401


# @bp.get("id")
# @require_logged_in_user
# def id(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
#     print(user_id)
#     return str(user_id), 200
