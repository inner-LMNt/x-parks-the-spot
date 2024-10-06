from xpark.utils.db import DB
import uuid
from xpark.config import Config
from result import Result, Ok, Err
from typing import cast, Tuple
import uuid


# TODO: Return parking space JSON and not just the space IDs
# TODO: More search parameters
def search_parking_space(
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


def create_parking_space(owner: uuid.UUID, lat: float, long: float) -> Result[None, None]:
    with DB.pool.connection() as conn:
        conn.execute(
            "INSERT INTO parking_spaces (owner, location) VALUES (%s, ST_MakePoint(%s, %s))",
            (owner, long, lat),
        )
        return Ok(None)
