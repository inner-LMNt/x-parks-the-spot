from . import bp
from xpark.logic.parkingspace import get_bookmarked_spots

from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid
from result import Ok, Err


@bp.get("")
@require_logged_in_user
def get_bookmarked_spots_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    match get_bookmarked_spots(user_id):
        case Ok(spots):
            return spots, 200
        case Err(e):
            return {"err": e}, 401
