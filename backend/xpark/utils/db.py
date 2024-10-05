from xpark.config import Config
import os
from pathlib import Path
from psycopg_pool import ConnectionPool
from psycopg import Connection
from typing import Any, cast
import sys

# To import migrations from module dir
MIGRATION_BASEDIR = os.path.join(
    cast(Path, os.path.dirname(str(sys.modules["xpark"].__file__))), "migrations"
)


class DB:
    pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=False)
    #token_cache = redis.Redis().from_url(Config.REDIS_URI)


def run_migration(conn: Connection, file_name: str) -> None:
    with conn.cursor() as cur:
        # Check if migration is already applied
        # Check if the migration name is already in the table
        cur.execute(
            "SELECT COUNT(1) FROM migrations WHERE migration_name = %s",
            (file_name,),
        )

        # If the migration is not in the table, execute the migration
        if cur.fetchone() == (0,):
            with open(os.path.join(MIGRATION_BASEDIR, file_name), "r") as f:
                cur.execute(cast(Any, f.read()))
                cur.execute(
                    "INSERT INTO migrations (migration_name) VALUES (%s)",
                    (file_name,),
                )


def makemigrate(conn: Connection) -> None:
    # First, track the migrations
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS migrations (migration_name text PRIMARY KEY)
            """
        )

    # Run each migration
    for migration_file in sorted(os.listdir(MIGRATION_BASEDIR)):
        if migration_file.endswith(".sql"):
            # Remove .sql extension and run migration
            run_migration(conn, migration_file)
