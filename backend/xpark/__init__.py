from flask import Flask, send_from_directory
from .config import Config
from psycopg_pool import ConnectionPool
import smtplib
from typing import Any


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize DB
    from .utils.db import DB, makemigrate

    DB.pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=True)

    # Initialize Mailer
    from .utils.mailer import SMTPConn

    if Config.SMTP_ENABLED:
        if Config.SMTP_TLS == "yes":
            SMTPConn.conn = smtplib.SMTP_SSL(Config.SMTP_HOST)
        else:
            SMTPConn.conn = smtplib.SMTP()

        SMTPConn.conn.connect(host=Config.SMTP_HOST)
        SMTPConn.conn.login(user=Config.SMTP_USERNAME, password=Config.SMTP_PASSWORD)

    # Run SQL migrations in one transaction. Any failures will not modify the database
    with DB.pool.connection() as conn:
        makemigrate(conn)

    import xpark.api.unstable as unstable

    app.register_blueprint(unstable.bp)

    @app.route("/static/<path:filename>")
    def static_files(filename: str) -> Any:
        return send_from_directory(Config.STATIC_FOLDER, filename)

    @app.route("/")
    def status() -> str:
        return "running"

    return app
