from flask import Flask
from .config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize DB
    from .utils.db import pool
    from .utils.db import makemigrate

    # Run SQL migrations in one transaction. Any failures will not modify the database
    with pool.connection() as conn:
        makemigrate(conn)

    import app.api.unstable as unstable

    app.register_blueprint(unstable.bp)

    @app.route("/")
    def status():
        return "running"

    return app
