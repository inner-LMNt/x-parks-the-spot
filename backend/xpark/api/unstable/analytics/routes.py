from flask import request
from . import bp
from xpark.logic.analytics import get_dashboard_analytics
from xpark.middleware.token_auth_middleware import require_logged_in_user
from typing import Tuple, Any
import uuid
from result import Ok, Err


@bp.get("dashboard")
@require_logged_in_user
def get_dashboard_analytics_route(token: str, user_id: uuid.UUID) -> Tuple[Any, int]:
    time_filter = request.args.get("time_filter", "30_days")

    match get_dashboard_analytics(
        user_id=user_id, time_filter=time_filter
    ):
        case Ok(data):
            return data, 200
        case Err(e):
            return {"err": e}, 400  # Return 400 for client errors
