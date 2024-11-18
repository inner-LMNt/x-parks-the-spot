from flask import Flask
from .config import Config
from psycopg_pool import ConnectionPool
import smtplib


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize DB
    from .utils.db import DB, makemigrate

    DB.pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=True)

    # Initialize Mailer
    from .utils.mailer import SMTPConn
    from .utils.mailer import connect as mailer_connect

    if Config.SMTP_ENABLED == "yes":
        if Config.SMTP_TLS == "yes":
            SMTPConn.conn = smtplib.SMTP_SSL(Config.SMTP_HOST)
        else:
            SMTPConn.conn = smtplib.SMTP()

        mailer_connect()

    # Initialize S3 uploads
    from .utils.s3 import S3

    if Config.S3_ENABLED == "yes":
        S3.connect()

    # Run SQL migrations in one transaction. Any failures will not modify the database
    with DB.pool.connection() as conn:
        makemigrate(conn)

    import xpark.api.unstable as unstable

    app.register_blueprint(unstable.bp)

    @app.route("/")
    def status() -> str:
        return "running"

    return app
