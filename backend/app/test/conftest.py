import pytest
from app.config import Config
import psycopg
from psycopg_pool import ConnectionPool
from typing import Any, Generator, cast


@pytest.fixture(scope="function", autouse=True)
def initialize_db() -> Generator[Any, Any, Any]:
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

        yield

        cur.execute(
            cast(
                Any,
                "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME,
            )
        )
