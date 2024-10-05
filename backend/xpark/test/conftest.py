import pytest
from xpark.config import Config
import xpark
import psycopg
from typing import Any, Generator, cast
from flask import Flask


@pytest.fixture(scope="function", autouse=True)
def app() -> Generator[Any, Any, Any]:
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

        Config.DATABASE_URI = (
            Config.TEST_DATABASE_URI + " dbname=" + Config.TEST_DATABASE_NAME
        )

        yield xpark.create_app()

        # Cleanup
        cur.execute(
            cast(
                Any,
                "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME,
            )
        )


@pytest.fixture()
def client(app: Flask) -> Any:
    return app.test_client()


@pytest.fixture()
def runner(app: Flask) -> Any:
    return app.test_cli_runner()
