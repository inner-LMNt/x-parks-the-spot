from flask import Flask
from config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    import app.api.unstable as unstable
    app.register_blueprint(unstable.bp)

    @app.route("/")
    def status():
        return "running"

    return app
