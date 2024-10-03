from flask import Flask, Blueprint
from typing import Tuple, Any


class RequireJSON(object):
    def __init__(self, app: Flask | Blueprint):
        app.register_error_handler(KeyError, keyerror_returns_400)


def keyerror_returns_400(_: Exception) -> Tuple[Any, int]:
    return {"err": "Missing fields"}, 400
