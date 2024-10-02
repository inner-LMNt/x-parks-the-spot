from flask import Flask, Response, Blueprint
from xpark.config import Config


class CORS(object):
    def __init__(self, app: Flask | Blueprint):
        app.after_request(corsify_response)


def corsify_response(response: Response) -> Response:
    response.headers.add("Access-Control-Allow-Origin", Config.ALLOWED_ORIGIN)
    response.headers.add("Access-Control-Allow-Headers", Config.ALLOWED_ORIGIN)
    response.headers.add("Access-Control-Allow-Methods", Config.ALLOWED_ORIGIN)
    return response
