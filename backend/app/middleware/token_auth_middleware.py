from flask import request
from app.logic.user import validate_token_and_refresh
from result import Ok, Err
from typing import Callable, Any, Tuple, Protocol, TypedDict, Unpack
import uuid


# These two classes implement type-checking to ensure decorated functions have both the `token` and `user_id` arguments
class AuthParams(TypedDict):
    token: str
    user_id: uuid.UUID


class AuthFunction(Protocol):
    def __call__(self, **kwargs: Unpack[AuthParams]) -> Tuple[Any, int]: ...


def require_logged_in_user(next_fn: AuthFunction) -> Callable[..., Tuple[Any, int]]:
    def wrapper(*args: Any, **kwargs: Any) -> Tuple[Any, int]:
        # Extract the bearer auth
        token_to_check = request.headers.get("Authorization")
        if token_to_check is None:
            return {"err": "No authentication provided"}, 403
        token_to_check = token_to_check.strip()
        # This token is prefixed with "Bearer", so we have to trim that
        split_token = token_to_check.split(" ")
        if len(split_token) != 2:
            return {"err": "Bad authentication"}, 400
        match validate_token_and_refresh(split_token[1]):
            case Ok(user_id):
                kwargs["user_id"] = user_id
                kwargs["token"] = split_token[1]
                return next_fn(*args, **kwargs)
            case Err(e):
                return {"err": e}, 401

    return wrapper
