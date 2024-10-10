import os
from typing import Dict, Any, Optional

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from psycopg.rows import dict_row

from xpark.config import Config
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid


def get_owned_paid_parking_spaces(
    user_id: uuid.UUID,
) -> Result[list[Dict[Any, Any]], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT 
                    name, 
                    is_paid, 
                    verification_status, 
                    ST_Y(location::geometry) AS latitude, 
                    ST_X(location::geometry) AS longitude, 
                    address, 
                    availability_schedule, 
                    pricing_info,
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
                    photos
                )
                VALUES (%s, FALSE, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s)
                RETURNING id, created_at, updated_at
                """,
                (user_id, longitude, latitude, address, photos),
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
                    ST_X(location::geometry) AS longitude,
                    ST_Y(location::geometry) AS latitude,
                    features,
                    availability_schedule,
                    pricing_info,
                    photos,
                    verification_status,
                    dynamic_pricing_enabled,
                    cancellation_policy,
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
    name: Optional[str],
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

            cur.execute(
                """
                UPDATE parking_spaces SET
                name = COALESCE(%s, name),
                updated_at = NOW()
                WHERE id = %s
                RETURNING
                    owner,
                    name,
                    ST_X(location::geometry) AS longitude,
                    ST_Y(location::geometry) AS latitude,
                    features,
                    availability_schedule,
                    pricing_info,
                    photos,
                    verification_status,
                    dynamic_pricing_enabled,
                    cancellation_policy,
                    created_at,
                    updated_at
                """,
                (name,),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Failed to update parking space")

            return Ok(parking_space)


def delete_parking_space(
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
