from . import bp
from app.logic.user import create_user, create_token, check_username_password
from flask import request
from result import Result, Ok, Err
from app.middleware.token_auth_middleware import require_logged_in_user


@bp.post("create")
def create():
    # If we have a keyerror (param not sent), the app returns a 400 here
    match create_user(
        name=request.form["name"],
        password=request.form["password"],
        email=request.form["email"],
    ):
        case Ok(new_uuid):
            return str(new_uuid)
        case Err(e):
            # Should we return 409 instead? https://stackoverflow.com/questions/3825990/http-response-code-for-post-when-resource-already-exists
            return e, 400


@bp.post("login")
def login():
    match check_username_password(
        password=request.form["password"],
        email=request.form["email"],
    ):
        case Ok(user_id):
            return create_token(user_id)
        case Err(e):
            return e, 403

@bp.get("id")
@require_logged_in_user
def id(user_id):
    print(user_id)
    return str(user_id)
