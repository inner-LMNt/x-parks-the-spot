from . import bp
from app.logic.user import *
from flask import request
from result import Result, Ok, Err
from app.middleware.token_auth_middleware import require_logged_in_user


@bp.post("register")
def create():
    # If we have a keyerror (param not sent), the app returns a 400 here
    # FIXME: validate email address
    match create_user(
        name=request.form["full_name"],
        password=request.form["password"],
        email=request.form["email"],
    ):
        case Ok(new_uuid):
            return {"access_token": create_token(new_uuid), "token_type": "Bearer"}, 201
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
            return {"access_token": create_token(user_id), "token_type": "Bearer"}, 201
        case Err(e):
            return e, 401


@bp.post("logout")
def logout(token):
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
