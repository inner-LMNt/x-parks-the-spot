import uuid
from typing import cast

from xpark.utils.db import DB
def search_query(
    lat: float, long: float, radius_meters: int
) -> list[uuid.UUID]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM parking_spaces WHERE ST_DWithin(location, ST_MakePoint(%s, %s), %s)",
                (long, lat, radius_meters),
            )
            # Convert the list of tuples of IDs to a list of IDs
            return [cast(uuid.UUID, id) for x in cur.fetchall() for id in x]