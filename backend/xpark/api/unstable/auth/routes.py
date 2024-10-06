from . import bp
from xpark.logic.user import (
    expire_valid_token,
    create_token,
    check_username_password,
    is_user_deleted,
    handle_user_registration,
    handle_delete_account_request,
    handle_confirm_delete,
)

from flask import request
from result import Ok, Err
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid

@bp.post("register")
def create() -> Tuple[Any, int]:
    try:
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
    except KeyError:
        return {"err": "Missing required fields"}, 400



@bp.post("login")
def login() -> Tuple[Any, Any]:
    match check_username_password(
        password=request.json["password"],  # type: ignore
        email=request.json["email"],  # type: ignore
    ):
        case Ok(user_id):
            # Check if the user is marked as deleted
            if is_user_deleted(user_id):
                return {"err": "User account is deleted. Please contact support."}, 403  # Forbidden error code
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

@bp.post("request_delete_account", endpoint="auth/request_delete_account")
@require_logged_in_user
def request_delete_account(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    #data = request.get_json()
    #password = data.get('password')
    password = request.json.get('password')

    # Call the helper function to handle the request
    result = handle_delete_account_request(user_id, password)

    if isinstance(result, Ok):
        return {"message": "Account deletion email sent"}, 200
    else:
        return {"err": result.value}, 500 if "failed" in result.value.lower() else 401


@bp.route("confirm-delete/<token>")
def confirm_delete_account(token: str) -> Tuple[Any, int]:
    match handle_confirm_delete(token):
        case Ok(_):
            return {"message": "Account deleted successfully"}, 200
        case Err(e):
            return {"err": e}, 400



# @bp.get("id")
# @require_logged_in_user
# def id(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
#     print(user_id)
#     return str(user_id), 200
