from . import bp
from xpark.logic.user import (
    expire_valid_token,
    create_token,
    check_username_password,
    get_user_email_by_id,
    soft_delete_user_account,
    store_deletion_request,
    generate_deletion_token,
    check_deletion_request_validity,
    validate_deletion_token,
    delete_all_tokens_for_user,
    is_user_deleted,
    handle_user_registration,
)
from xpark.utils.email_sender import send_deletion_email
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
    data = request.get_json()
    password = data.get('password')

    match get_user_email_by_id(user_id):
        case Ok(user_email):
            match check_username_password(user_email, password):
                case Ok(_):
                    match generate_deletion_token():
                        case Ok((delete_token)):
                            match store_deletion_request(user_id, delete_token):
                                case Ok(_):
                                    delete_link = f"http://localhost:3000/confirm-deletion/{delete_token}"
                                    send_deletion_email(user_email, delete_link)
                                    return {"message": "Account deletion email sent"}, 200
                                case Err(e):
                                    return {"err": e}, 500
                        case Err(e):
                            return {"err": "Token generation failed"}, 500
                case Err(e):
                    return {"err": "Invalid password"}, 401
        case Err(e):
            return {"err": "User not found"}, 404
    return {"err": "Unexpected error"}, 500  # Ensure all paths return

@bp.route("confirm-delete/<token>", methods=['GET'])
def confirm_delete_account(token: str) -> Tuple[Any, int]:
    # Validate the token received in the URL
    print(f"Token received: {token}")
    match validate_deletion_token(token):  # Ensure the token is valid
        case Ok(user_id):  # If the token is valid, proceed with user deletion
            # Check if the deletion request is still valid within the 30-minute window
            match check_deletion_request_validity(user_id):
                case Ok(_):
                    # Perform the account deletion (soft delete)
                    match soft_delete_user_account(user_id):
                        case Ok(_):
                            # After deletion, remove all user tokens to log them out
                            delete_all_tokens_for_user(user_id)
                            return {"message": "Account deleted successfully"}, 200
                        case Err(e):
                            return {"err": f"Failed to delete account: {e}"}, 500
                case Err(e):
                    return {"err": f"Deletion request expired: {e}"}, 400
        case Err(e):
            return {"err": f"Invalid or expired token: {e}"}, 400


# @bp.get("id")
# @require_logged_in_user
# def id(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
#     print(user_id)
#     return str(user_id), 200
