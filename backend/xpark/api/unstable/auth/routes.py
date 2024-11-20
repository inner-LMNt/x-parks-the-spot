from . import bp
from xpark.logic.user import (
    expire_valid_token,
    create_token,
    check_username_password,
    handle_user_registration,
    handle_delete_account_request,
    handle_confirm_delete,
    handle_password_reset_request,
    handle_password_reset_confirmation,
    handle_set_notification_time,
    handle_get_notification_time,
    handle_get_points,  # Testing purposes
)


from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.post("register")
def create() -> Tuple[Any, int]:
    # Extract user info from the request
    name = request.json["full_name"]  # type: ignore
    password = request.json["password"]  # type: ignore
    email = request.json["email"]  # type: ignore

    # Call the logic function to handle the registration
    match handle_user_registration(name, email, password):
        case Ok(user_id):
            # Generate access token for the new/undeleted user
            return {"access_token": create_token(user_id)}, 201
        case Err("User already exists"):
            return {"err": "Email already in use"}, 409
        case Err(e):
            return {"err": e}, 400


@bp.post("login")
def login() -> Tuple[Any, Any]:
    match check_username_password(
        password=request.json["password"],  # type: ignore
        email=request.json["email"],  # type: ignore
    ):
        case Ok(user_id):
            return {"access_token": create_token(user_id)}, 200
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


@bp.post("request_delete_account")
@require_logged_in_user
def request_delete_account(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    password = request.json["password"]  # type: ignore

    # Call the helper function to handle the request
    match handle_delete_account_request(user_id, password):
        case Ok(_):
            return {"message": "Account deletion email sent"}, 200
        case Err(e):
            return {"err": e}, 401


# FIXME: this isn't idempotent, but it's gotta be a clickable link so
@bp.get("confirm-delete/<token>")
def confirm_delete_account(token: str) -> Tuple[Any, int]:
    match handle_confirm_delete(token):
        case Ok(_):
            return {"message": "Account deleted successfully"}, 200
        case Err(e):
            return {"err": e}, 403


@bp.post("password-reset")
def reset_password_request() -> Tuple[Any, int]:
    email = request.json["email"]  # type: ignore

    match handle_password_reset_request(email):
        case Ok(_):
            return {"message": "Password reset email sent"}, 200
        case Err(e):
            return {"err": e}, 403


@bp.post("/reset-password/<token>")
def reset_password(token: str) -> Tuple[Any, int]:
    new_password = request.json["new_password"]  # type: ignore

    match handle_password_reset_confirmation(token, new_password):
        case Err(e):
            return {"err": e}, 403
        case Ok(_):
            return {"message": "Password reset successfully"}, 200


@bp.post("notification-time")
@require_logged_in_user
def set_notification_time(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    assert request.json
    time = request.json["time"]
    match handle_set_notification_time(user_id, time):
        case Ok(_):
            return {"message": "Notification time set successfully"}, 200
        case Err(e):
            return {"err": e}, 403


@bp.get("notification-time")
@require_logged_in_user
def get_notification_time(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match handle_get_notification_time(user_id):
        case Ok(time):
            return {"time": time}, 200
        case Err(e):
            return {"err": e}, 403


@bp.get("points")
@require_logged_in_user
def get_points(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match handle_get_points(user_id):
        case Ok(points):
            return {"points": points}, 200
        case Err(e):
            return {"err": e}, 403


# @bp.get("id")
# @require_logged_in_user
# def id(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
#     print(user_id)
#     return str(user_id), 200
