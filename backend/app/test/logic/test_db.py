import os


def test_verify_migration() -> None:
    from app.utils.db import DB

    with DB.pool.connection() as conn:
        cur = conn.cursor()

        # Return the list of migrations run
        cur.execute("SELECT migration_name FROM migrations")
        # This should be the same as the list of files in the migration directory

        from app.utils.db import MIGRATION_BASEDIR

        a = cur.fetchall()
        # List comprehension to convert 2d tuple into 1d array
        assert os.listdir(MIGRATION_BASEDIR) == [x for xs in a for x in xs]
