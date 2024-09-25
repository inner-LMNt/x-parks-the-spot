import pytest
from app.config import Config
import psycopg
from psycopg_pool import ConnectionPool
from typing import Any, Generator, cast
from flask import Flask


@pytest.fixture(scope="function", autouse=True)
def app() -> Generator[Any]:

    app = Flask(__name__)
    app.config.from_object(Config)

    with psycopg.connect(Config.TEST_DATABASE_URI, autocommit=True) as conn:
        cur = conn.cursor()

        # create test DB, drop before
        # WARNING: THIS IS NOT HOW TO DO DATABASE STUFF! I AM DOING IT LIKE THIS BECAUSE DROPPING DATABASES CANNOT USE PREPARED STATEMENTS
        cur.execute(
            cast(
                Any,
                "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME,
            )
        )
        cur.execute(cast(Any, "CREATE DATABASE %s" % Config.TEST_DATABASE_NAME))

        from app.utils.db import DB, makemigrate

        Config.DATABASE_URI = (
            Config.TEST_DATABASE_URI + " dbname=" + Config.TEST_DATABASE_NAME
        )
        DB.pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=True)

        with DB.pool.connection() as pool_conn:
            makemigrate(pool_conn)

        # Continue with application setup

        yield app

        # Cleanup
        cur.execute(
            cast(
                Any,
                "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME,
            )
        )

    # clean up / reset resources here


@pytest.fixture()
def client(app: Flask) -> Any:
    return app.test_client()


@pytest.fixture()
def runner(app: Flask) -> Any:
    return app.test_cli_runner()
