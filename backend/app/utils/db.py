from psycopg_pool import ConnectionPool
from config import Config
import os
import redis

MIGRATION_BASEDIR = "migrations"


# Initialize the database
pool = ConnectionPool(conninfo=Config.DATABASE_URI, open=True)

token_cache = redis.Redis().from_url(Config.REDIS_URI)


def run_migration(conn, file_name):
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
                cur.execute(f.read())
                cur.execute(
                    "INSERT INTO migrations (migration_name) VALUES (%s)",
                    (file_name,),
                )


def makemigrate(conn):
    # First, track the migrations
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS migrations (migration_name text PRIMARY KEY)
            """
        )

    # Run each migration
    for migration_file in os.listdir(MIGRATION_BASEDIR):
        if migration_file.endswith(".sql"):
            # Remove .sql extension and run migration
            run_migration(conn, migration_file)
