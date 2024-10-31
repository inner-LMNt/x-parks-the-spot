import os
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from psycopg.rows import dict_row

from xpark.config import Config
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
from .timeslots import days_of_week_to_slots, recalculate_coalesce


def get_owned_paid_parking_spaces(
    user_id: uuid.UUID,
) -> Result[list[Dict[Any, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    id,
                    is_paid, 
                    name,
                    json_build_object(
                        'address', parking_spaces.address,
                        'latitude', ST_Y(parking_spaces.location::geometry),
                        'longitude', ST_X(parking_spaces.location::geometry)
                    ) as location,
                    json_build_object(
                        'base_price', price,
                        'dynamic_pricing', FALSE
                    ) as pricing_info,
                    availability_schedule,
                    verification_status, 
                    photos,
                    created_at, 
                    updated_at
                FROM parking_spaces
                WHERE owner = %s AND is_paid = TRUE
            """,
                (user_id,),
            )
            rows = cur.fetchall()

            return Ok(rows)


def create_paid_parking_space(
    user_id: uuid.UUID,
    image_file: Optional[FileStorage],
    longitude: float,
    latitude: float,
    address: str,
    name: str,
    price: float,  # FIXME: do not pass around money as floats!!!
    availability_schedule: List[Dict[str, str]],
) -> Result[Dict[str, Any], str]:
    # Save image
    if image_file:
        image_uri = save_image(image_file)
        photos = [image_uri]
    else:
        photos = []
    # Insert into database
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO parking_spaces (
                    owner,
                    is_paid,
                    location,
                    address,
                    photos,
                    verification_status,
                    name,
                    availability_schedule,
                    price,
                    photo_timestamp
                )
                VALUES (
                    %(user_id)s,
                    TRUE,
                    ST_SetSRID(ST_MakePoint(%(long)s, %(lat)s),	4326),
					%(addr)s,
					%(photos)s,
					'unverified',
					%(name)s,
                    %(sched)s,
					%(price)s,
					NOW()
                )
                RETURNING id, created_at, updated_at
                """,
                {
                    "user_id": user_id,
                    "long": longitude,
                    "lat": latitude,
                    "addr": address,
                    "photos": photos,
                    "name": name,
                    "price": price,
                    "sched": json.dumps(availability_schedule),
                },
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Error creating parking space")

            # Regenerate availability schedule
            days_of_week_to_slots(cur, parking_space["id"], availability_schedule)
            # Recoalesce
            recalculate_coalesce(cur, parking_space["id"])

            return Ok(parking_space)


def create_free_parking_space(
    user_id: uuid.UUID,
    image_file: Optional[FileStorage],
    longitude: float,
    latitude: float,
    address: str,
) -> Result[Dict[str, Any], str]:
    # Save image
    if image_file:
        image_uri = save_image(image_file)
        photos = [image_uri]
    else:
        photos = []

    # Provide default values
    default_name = f'Spot Logged at {datetime.now().strftime("%I:%M %p, %B %d %Y")}'
    default_verification_status = 'unverified'
    default_availability_schedule = json.dumps([])  # or another appropriate default
    default_price = 0

    # Insert into database
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO parking_spaces (
                    owner,
                    is_paid,
                    location,
                    address,
                    photos,
                    photo_timestamp,
                    verification_status,
                    name,
                    availability_schedule,
                    price
                )
                VALUES (%s, FALSE, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, NOW(), %s, %s, %s, %s)
                RETURNING id, created_at, updated_at
                """,
                (
                    user_id,
                    longitude,
                    latitude,
                    address,
                    photos,
                    default_verification_status,
                    default_name,
                    default_availability_schedule,
                    default_price,
                ),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Error creating parking space")

            return Ok(parking_space)

# TODO: Review
def save_image(image_file: FileStorage) -> str:
    allowed_extensions = {"png", "jpg", "jpeg", "gif"}
    filename = secure_filename(image_file.filename or "")
    extension = filename.rsplit(".", 1)[1].lower()
    if "." in filename and extension in allowed_extensions:
        images_dir = os.path.join(Config.STATIC_FOLDER, "images")
        os.makedirs(images_dir, exist_ok=True)
        unique_filename = f"{uuid.uuid4()}.{extension}"
        filepath = os.path.join(images_dir, unique_filename)
        image_file.save(filepath)
        image_uri = f"/static/images/{unique_filename}"
        return image_uri
    else:
        raise ValueError("Invalid image file type")


def get_parking_space(parking_space_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    owner,
                    is_paid,
                    name,
                    json_build_object(
                        'address', address,
                        'latitude', ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ) as location,
                    json_build_object(
                        'base_price', price,
                        'dynamic_pricing', FALSE
                    ) as pricing_info,
                    photos,
                    availability_schedule,
                    verification_status,
                    created_at,
                    updated_at
                FROM parking_spaces
                WHERE id = %s
                """,
                (parking_space_id,),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Error getting parking space")

            return Ok(parking_space)


def update_paid_parking_space(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    address: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    name: Optional[str],
    price: Optional[float],
    availability_schedule: Optional[List[Dict[str, str]]],
) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Check if parking space exists and if the user is the owner
            cur.execute(
                "SELECT count(id) FROM parking_spaces WHERE id = %s AND owner = %s",
                (parking_space_id, user_id),
            )
            result = cur.fetchone()
            if not result:
                return Err("Parking space not found")

            # TODO: add more modification fields
            # photos,
            # verification_status,
            cur.execute(
                """
                UPDATE parking_spaces SET
                address =    COALESCE(%(addr)s, address),
                location =   ST_MakePoint(
                    COALESCE(%(long)s, ST_X(location::geometry)),
                    COALESCE(%(lat)s,  ST_Y(location::geometry))
                ),
                name =       COALESCE(%(name)s, name),
                price =      COALESCE(%(price)s, price),
                availability_schedule = COALESCE(%(sched)s, availability_schedule),
                updated_at = NOW()
                WHERE id =   %(spot_id)s
                RETURNING
                    id,
                    is_paid, 
                    name,
                    verification_status, 
                    json_build_object(
                        'address',   parking_spaces.address,
                        'latitude',  ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ) as location,
                    json_build_object(
                        'base_price', price,
                        'dynamic_pricing', FALSE
                    ) as pricing_info,
                    availability_schedule,
                    photos,
                    created_at, 
                    updated_at
                """,
                {
                    "addr": address,
                    "lat": latitude,
                    "long": longitude,
                    "name": name,
                    "price": price,
                    "spot_id": parking_space_id,
                    "sched": (
                        json.dumps(availability_schedule)
                        if availability_schedule
                        else availability_schedule
                    ),
                },
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Failed to update parking space")

            if availability_schedule is not None:
                # Regenerate availability schedule
                days_of_week_to_slots(cur, parking_space["id"], availability_schedule)
                # Recoalesce
                recalculate_coalesce(cur, parking_space["id"])

            return Ok(parking_space)


def delete_free_parking_space(
    user_id: uuid.UUID, parking_space_id: uuid.UUID
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM parking_spaces WHERE id = %s AND owner = %s AND is_paid = FALSE",
                (parking_space_id, user_id),
            )
            return Ok(None)


def is_paid_spot(parking_space_id: uuid.UUID) -> Result[bool, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT is_paid FROM parking_spaces WHERE id = %s", (parking_space_id,)
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Parking space doesn't exist")
            return Ok(parking_space[0])


def handle_submit_verification(
    parking_space_id: uuid.UUID,
    image_file: Optional[FileStorage],
    user_id: uuid.UUID,
) -> Result[None, str]:

    if image_file is None:
        return Err("No image provided for verification")

    # Save the image
    image_uri = save_image(image_file)

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE parking_spaces
                SET verification_status = %s, verification_photos = ARRAY[%s], updated_at = NOW()
                WHERE id = %s AND owner = %s AND is_paid = true
                """,
                ("pending", image_uri, parking_space_id, user_id),
            )
            # Check if any rows were updated
            if cur.rowcount == 0:
                return Err(
                    "Failed to update verification status or parking space not found"
                )

            return Ok(None)

