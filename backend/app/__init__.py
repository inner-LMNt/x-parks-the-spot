from flask import Flask
from .config import Config
from psycopg_pool import ConnectionPool


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize DB
    from .utils.db import DB, makemigrate

    DB.pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=True)

    # Run SQL migrations in one transaction. Any failures will not modify the database
    with DB.pool.connection() as conn:
        makemigrate(conn)

    import app.api.unstable as unstable

    app.register_blueprint(unstable.bp)

    @app.route("/")
    def status() -> str:
        return "running"

    return app
