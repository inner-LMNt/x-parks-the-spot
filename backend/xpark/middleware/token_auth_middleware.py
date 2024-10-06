from flask import request
from xpark.logic.user import validate_token_and_refresh
from result import Ok, Err
from typing import Callable, Any, Tuple, Protocol, TypedDict, Unpack
import uuid
from functools import wraps


# These two classes implement type-checking to ensure decorated functions have both the `token` and `user_id` arguments
class AuthParams(TypedDict):
    token: str
    user_id: uuid.UUID


class AuthFunction(Protocol):
    def __call__(self, **kwargs: Unpack[AuthParams]) -> Tuple[Any, int]: ...


def require_logged_in_user(next_fn: AuthFunction) -> Callable[..., Tuple[Any, int]]:
    @wraps(next_fn)
    def wrapper(*args: Any, **kwargs: Any) -> Tuple[Any, int]:
        # Extract the bearer auth
        token_to_check = request.headers.get("Authorization")
        if token_to_check is None:
            return {"err": "No authentication provided"}, 403
        token_to_check = token_to_check.strip()
        # This token is prefixed with "Bearer", so we have to trim that
        if not token_to_check.startswith("Bearer "):
            return {"err": "Bad authentication"}, 400
        token = token_to_check[7:]

        match validate_token_and_refresh(token):
            case Ok(user_id):
                kwargs["user_id"] = user_id
                kwargs["token"] = token
                return next_fn(*args, **kwargs)
            case Err(e):
                return {"err": e}, 401

    return wrapper
