from . import bp
from xpark.logic.parkingspace import get_bookmarked_spots

from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid


@bp.get("")
@require_logged_in_user
def get_bookmarked_spots_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    return get_bookmarked_spots(user_id).ok_value, 200
