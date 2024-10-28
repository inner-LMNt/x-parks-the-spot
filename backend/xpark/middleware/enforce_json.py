from flask import Flask, Blueprint
from typing import Tuple, Any


class RequireJSON(object):
    def __init__(self, app: Flask | Blueprint):
        app.register_error_handler(KeyError, keyerror_returns_400)
        app.register_error_handler(ValueError, bad_uuid_returns_400)


def keyerror_returns_400(e: KeyError) -> Tuple[Any, int]:
    return {"err": f"Missing field {e}"}, 400


def bad_uuid_returns_400(e: ValueError) -> Tuple[Any, int]:
    if str(e) == "badly formed hexadecimal UUID string":
        return {"err": "Bad UUID"}, 400
    elif "Invalid isoformat string" in str(e):
        return {"err": "Bad date format"}, 400
    raise e
