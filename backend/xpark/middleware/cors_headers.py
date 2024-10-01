from flask import Flask, Response, Blueprint


class CORS(object):
    def __init__(self, app: Flask | Blueprint):
        app.after_request(corsify_response)


def corsify_response(response: Response) -> Response:
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response
