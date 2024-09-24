# https://dev.to/liborjelinek/pytest-and-postgresql-fresh-database-for-every-test-4eni

import pytest
import os
from app.config import Config
import psycopg


@pytest.fixture
def test_db(migrate):
    with psycopg.connect(Config.TEST_DATABASE_URI, autocommit=True) as conn:
        cur = conn.cursor()

        # create test DB, drop before
        # WARNING: THIS IS NOT HOW TO DO DATABASE STUFF! I AM DOING IT LIKE THIS BECAUSE DROPPING DATABASES CANNOT USE PREPARED STATEMENTS
        cur.execute(
            "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME  # type: ignore
        )
        cur.execute("CREATE DATABASE %s" % Config.TEST_DATABASE_NAME)  # type: ignore

        # Set real database vars to be the test ones
        Config.TEST_DATABASE_URI += "dbname=" + Config.TEST_DATABASE_NAME
        Config.DATABASE_URI = Config.TEST_DATABASE_URI

        from app.utils.db import pool

        yield pool

        cur.execute(
            "DROP DATABASE IF EXISTS %s WITH (FORCE)" % Config.TEST_DATABASE_NAME  # type: ignore
        )


@pytest.fixture
def migrate():
    from app.utils.db import pool, makemigrate

    with pool.connection() as conn:
        makemigrate(conn)


def test_verify_migration(test_db):
    from app.utils.db import pool

    with pool.connection() as conn:
        cur = conn.cursor()

        # Return the list of migrations run
        cur.execute("SELECT migration_name FROM migrations")
        # This should be the same as the list of files in the migration directory

        from app.utils.db import MIGRATION_BASEDIR

        a = cur.fetchall()
        assert os.listdir(MIGRATION_BASEDIR) == [x for xs in a for x in xs]
