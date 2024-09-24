import pytest
from app.config import Config
import psycopg
from psycopg_pool import ConnectionPool


@pytest.fixture(scope="function", autouse=True)
def initialize_db():
    with psycopg.connect(Config.TEST_DATABASE_URI, autocommit=True) as conn:
        cur = conn.cursor()

        # create test DB, drop before
        # WARNING: THIS IS NOT HOW TO DO DATABASE STUFF! I AM DOING IT LIKE THIS BECAUSE DROPPING DATABASES CANNOT USE PREPARED STATEMENTS
        cur.execute(
            "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME  # type: ignore
        )
        cur.execute("CREATE DATABASE %s" % Config.TEST_DATABASE_NAME)  # type: ignore

        from app.utils.db import DB, makemigrate

        Config.DATABASE_URI = (
            Config.TEST_DATABASE_URI + " dbname=" + Config.TEST_DATABASE_NAME
        )
        DB.pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=True)

        with DB.pool.connection() as pool_conn:
            makemigrate(pool_conn)

        yield

        cur.execute(
            "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME  # type: ignore
        )
