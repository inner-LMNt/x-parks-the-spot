from flask import request
from app.logic.user import validate_token_and_refresh
from result import Ok, Err
from typing import Callable, Any, Tuple


def require_logged_in_user(
    next_fn: Callable[..., Tuple[Any, int]]
) -> Callable[..., Tuple[Any, int]]:
    def wrapper(*args: Any, **kwargs: Any) -> Tuple[Any, int]:
        # Extract the bearer auth
        token_to_check = request.headers.get("Authorization")
        if token_to_check is None:
            return "No authentication provided", 403
        token_to_check = token_to_check.strip()
        # This token is prefixed with "Bearer", so we have to trim that
        split_token = token_to_check.split(" ")
        if len(split_token) != 2:
            return "Bad authentication", 400
        match validate_token_and_refresh(split_token[1]):
            case Ok(user_id):
                kwargs["user_id"] = user_id
                kwargs["token"] = split_token[1]
                return next_fn(*args, **kwargs)
            case Err(e):
                return e, 401

    return wrapper
