import os
import json
from typing import Dict, Any, Optional, List

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from psycopg.rows import dict_row

from xpark.config import Config
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
from .timeslots import days_of_week_to_slots, recalculate_coalesce

def update_parking_space(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    name: Optional[str] = None,
    address: Optional[str] = None,
    price: Optional[float] = None,  # Only applies if the spot is paid
    photos: Optional[List[str]] = None  # List of new photo URLs if provided
) -> Result[Dict[str, Any], str]:
    """
    Update a parking space with optional fields like latitude, longitude, name, address, price, and photos.
    """

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Check if the parking space exists and if the user is the owner
            cur.execute(
                "SELECT is_paid FROM parking_spaces WHERE id = %s AND owner = %s",
                (parking_space_id, user_id),
            )
            result = cur.fetchone()
            if not result:
                return Err("Parking space not found or user not authorized to update")

            is_paid = result["is_paid"]

            # Only allow price update if it's a paid spot
            price_update = ", price = %(price)s" if is_paid and price is not None else ""

            # Update the parking space with provided values
            cur.execute(
                f"""
                UPDATE parking_spaces
                SET
                    latitude = COALESCE(%(latitude)s, latitude),
                    longitude = COALESCE(%(longitude)s, longitude),
                    name = COALESCE(%(name)s, name),
                    address = COALESCE(%(address)s, address),
                    updated_at = NOW()
                    {price_update}  -- Conditional price update for paid spaces
                    {", photos = photos || %(photos)s" if photos else ""}
                WHERE id = %(parking_space_id)s
                RETURNING id, name, address, latitude, longitude, price, photos, updated_at
                """,
                {
                    "latitude": latitude,
                    "longitude": longitude,
                    "name": name,
                    "address": address,
                    "price": price,
                    "photos": photos,
                    "parking_space_id": parking_space_id,
                },
            )
            updated_space = cur.fetchone()

            if not updated_space:
                return Err("Failed to update parking space")

            return Ok(updated_space)


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
                    price
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
					%(price)s
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


def update_taken(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    image_file: Optional[FileStorage] = None
) -> Result[Dict[str, Any], str]:
    """
    Sets 'is_taken' to TRUE and prepends any new photo to the parking space.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Verify that the user owns the parking space
            cur.execute(
                "SELECT 1 FROM parking_spaces WHERE id = %s AND owner = %s",
                (parking_space_id, user_id),
            )
            if not cur.fetchone():
                return Err("Parking space not found or user not authorized to update")

            # Handle photo processing if an image is provided
            new_photo_url = []
            if image_file:
                try:
                    photo_url = save_image(image_file)
                    new_photo_url = [photo_url]
                except ValueError as e:
                    return Err(f"Image upload failed: {str(e)}")

            # Update 'is_taken' status and prepend the new photo if provided
            cur.execute(
                """
                UPDATE parking_spaces
                SET
                    is_taken = TRUE,
                    updated_at = NOW(),
                    photos = %(new_photo_url)s || photos  -- Prepend new photo to the existing photos
                WHERE id = %(parking_space_id)s
                RETURNING id, photos, is_taken, updated_at
                """,
                {
                    "new_photo_url": new_photo_url,
                    "parking_space_id": parking_space_id,
                },
            )
            updated_space = cur.fetchone()

            if not updated_space:
                return Err("Failed to update parking space")

            return Ok(updated_space)




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
                SET verification_status = %s, photos = array_append(photos, %s), updated_at = NOW()
                WHERE id = %s AND owner = %s AND is_paid = true
                """,
                ("pending", image_uri, parking_space_id, user_id),
            )
            result = cur.fetchone()
            if not result:
                return Err(
                    "Failed to update verification status or parking space not found"
                )

            return Ok(None)
