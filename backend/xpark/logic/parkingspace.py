import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation

from xpark.config import Config
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
from .timeslots import days_of_week_to_slots, recalculate_coalesce


def award_points(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    status: str,
    points_amount: int = 10,
    image_file: Optional[FileStorage] = None,
) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Get the owner of the parking space
            cur.execute(
                """
                SELECT owner FROM parking_spaces WHERE id = %s
            """,
                (parking_space_id,),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Parking space not found")

            parking_space_owner_id = parking_space["owner"]

            # Handle "taken" and "parked" statuses
            if status in ["taken", "parked"]:
                # Prepare for updating the parking space
                new_photo_url = []
                if image_file:
                    try:
                        photo_url = save_image(image_file)
                        new_photo_url = [photo_url]
                    except ValueError as e:
                        return Err(f"Image upload failed: {str(e)}")

                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET
                        is_taken = TRUE,
                        updated_at = NOW(),
                        photos = %(new_photo_url)s || photos
                    WHERE id = %(parking_space_id)s
                    RETURNING id, is_taken, updated_at
                """,
                    {
                        "new_photo_url": new_photo_url,
                        "parking_space_id": parking_space_id,
                    },
                )

                if not cur.fetchone():
                    return Err("Failed to update parking space")

                # Award points only for "parked" status
                if status == "parked" and parking_space_owner_id != user_id:
                    now = datetime.now()

                    # Check for recent award restrictions
                    cur.execute(
                        """
                        SELECT timestamp
                        FROM points_transaction
                        WHERE user_id = %s AND transaction_type = 'award' AND timestamp >= %s
                    """,
                        (user_id, now - timedelta(hours=2)),
                    )
                    if cur.fetchone():
                        return Ok(
                            {
                                "message": "Points can only be awarded once every 2 hours to a spot finder."
                            }
                        )

                    cur.execute(
                        """
                        SELECT timestamp
                        FROM points_transaction
                        WHERE user_id = %s AND transaction_type = 'award' AND date_trunc('day', timestamp) = date_trunc('day', %s)
                    """,
                        (parking_space_owner_id, now),
                    )
                    if cur.fetchone():
                        return Ok(
                            {
                                "message": "Points can only be awarded once per day to the same spot finder."
                            }
                        )

                    # Update points for the owner
                    cur.execute(
                        """
                        SELECT points->>'current' AS current_points, points->>'total' AS total_points
                        FROM users
                        WHERE id = %s
                    """,
                        (parking_space_owner_id,),
                    )
                    owner_points = cur.fetchone()

                    if not owner_points:
                        return Err("Owner not found")

                    current_points = int(owner_points["current_points"])
                    total_points = int(owner_points["total_points"])

                    new_current_points = current_points + points_amount
                    new_total_points = total_points + points_amount

                    cur.execute(
                        """
                        UPDATE users
                        SET points = jsonb_set(
                            jsonb_set(points, '{current}', to_jsonb(%s::text)),
                            '{total}', to_jsonb(%s::text)
                        )
                        WHERE id = %s
                    """,
                        (new_current_points, new_total_points, parking_space_owner_id),
                    )

                    transaction_desc = (
                        f"Awarded for {status} parking space {parking_space_id}"
                    )
                    cur.execute(
                        """
                        INSERT INTO points_transaction (
                            user_id,
                            transaction_type,
                            points_amount,
                            description,
                            balance_after_transaction,
                            timestamp
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                        (
                            parking_space_owner_id,
                            "award",
                            points_amount,
                            transaction_desc,
                            new_current_points,
                            now,
                        ),
                    )

                    return Ok(
                        {
                            "current_points": new_current_points,
                            "total_points": new_total_points,
                            "action": f"{status} - award",
                        }
                    )

                return Ok(
                    {
                        "action": f"Status set to '{status}', no points awarded as the user is the owner of the parking space"
                    }
                )
            else:
                return Err("Invalid status provided. Use 'taken' or 'parked'.")


def get_all_user_parking_spaces(
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
                    updated_at,
                    CASE WHEN is_paid THEN COALESCE(avg_availability_rating, 0) ELSE NULL END AS avg_availability_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_cleanliness_rating, 0) ELSE NULL END AS avg_cleanliness_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_total_rating, 0) ELSE NULL END AS avg_total_rating,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_availability, 0) ELSE NULL END AS ratings_count_availability,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_cleanliness, 0) ELSE NULL END AS ratings_count_cleanliness
                FROM parking_spaces
                WHERE owner = %s
            """,
                (user_id,),
            )
            rows = cur.fetchall()

            # Adjust the output for paid parking spaces
            for row in rows:
                if row["is_paid"]:
                    if (
                        row["ratings_count_availability"] == 0
                        or row["ratings_count_availability"] is None
                    ) and (
                        row["ratings_count_cleanliness"] == 0
                        or row["ratings_count_cleanliness"] is None
                    ):
                        row["avg_total_rating"] = "unrated"
                    else:
                        row["avg_total_rating"] = (
                            float(row["avg_total_rating"])
                            if row["avg_total_rating"] != 0
                            else "unrated"
                        )
                        row["avg_availability_rating"] = (
                            float(row["avg_availability_rating"])
                            if row["avg_availability_rating"] != 0
                            else None
                        )
                        row["avg_cleanliness_rating"] = (
                            float(row["avg_cleanliness_rating"])
                            if row["avg_cleanliness_rating"] != 0
                            else None
                        )
                else:
                    # Remove rating fields for free spots
                    row.pop("avg_availability_rating", None)
                    row.pop("avg_cleanliness_rating", None)
                    row.pop("avg_total_rating", None)
                    row.pop("ratings_count_availability", None)
                    row.pop("ratings_count_cleanliness", None)

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
                    ST_SetSRID(ST_MakePoint(%(long)s, %(lat)s), 4326),
                    %(addr)s,
                    %(photos)s,
                    'unverified',
                    %(name)s,
                    %(sched)s,
                    %(price)s,
                    NOW()
                )
                RETURNING 
                    id, 
                    created_at, 
                    updated_at,
                    avg_availability_rating,
                    avg_cleanliness_rating,
                    avg_total_rating,
                    ratings_count_availability,
                    ratings_count_cleanliness
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

            # Initialize aggregated rating fields
            parking_space["avg_availability_rating"] = "unrated"
            parking_space["avg_cleanliness_rating"] = "unrated"
            parking_space["avg_total_rating"] = "unrated"
            parking_space["ratings_count_availability"] = 0
            parking_space["ratings_count_cleanliness"] = 0

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
    default_verification_status = "unverified"
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
                    is_taken,
                    availability_schedule,
                    verification_status,
                    created_at,
                    updated_at,
                    CASE WHEN is_paid THEN COALESCE(avg_availability_rating, 0) ELSE NULL END AS avg_availability_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_cleanliness_rating, 0) ELSE NULL END AS avg_cleanliness_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_total_rating, 0) ELSE NULL END AS avg_total_rating,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_availability, 0) ELSE NULL END AS ratings_count_availability,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_cleanliness, 0) ELSE NULL END AS ratings_count_cleanliness
                FROM parking_spaces
                WHERE id = %s
            """,
                (parking_space_id,),
            )
            parking_space = cur.fetchone()
            if not parking_space:
                return Err("Error getting parking space")

            # Adjust the output for paid parking spaces
            if parking_space["is_paid"]:
                if (
                    parking_space["ratings_count_availability"] == 0
                    or parking_space["ratings_count_availability"] is None
                ) and (
                    parking_space["ratings_count_cleanliness"] == 0
                    or parking_space["ratings_count_cleanliness"] is None
                ):
                    parking_space["avg_total_rating"] = "unrated"
                else:
                    parking_space["avg_total_rating"] = (
                        float(parking_space["avg_total_rating"])
                        if parking_space["avg_total_rating"] != 0
                        else "unrated"
                    )
                    parking_space["avg_availability_rating"] = (
                        float(parking_space["avg_availability_rating"])
                        if parking_space["avg_availability_rating"] != 0
                        else None
                    )
                    parking_space["avg_cleanliness_rating"] = (
                        float(parking_space["avg_cleanliness_rating"])
                        if parking_space["avg_cleanliness_rating"] != 0
                        else None
                    )
            else:
                # Remove rating fields for free spots
                parking_space.pop("avg_availability_rating", None)
                parking_space.pop("avg_cleanliness_rating", None)
                parking_space.pop("avg_total_rating", None)
                parking_space.pop("ratings_count_availability", None)
                parking_space.pop("ratings_count_cleanliness", None)

            return Ok(parking_space)


def update_taken(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    image_file: Optional[FileStorage] = None,
) -> Result[Dict[str, Any], str]:
    """
    Sets 'is_taken' to TRUE and prepends any new photo to the parking space.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            updated_name = f'Updated at {datetime.now().strftime("%I:%M %p, %B %d %Y")}'

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
                    name = %(updated_name)s,
                    is_taken = TRUE,
                    updated_at = NOW(),
                    photos = %(new_photo_url)s || photos  -- Prepend new photo to the existing photos
                WHERE id = %(parking_space_id)s
                RETURNING id, photos, is_taken, updated_at
                """,
                {
                    "updated_name": updated_name,
                    "new_photo_url": new_photo_url,
                    "parking_space_id": parking_space_id,
                },
            )
            updated_space = cur.fetchone()

            if not updated_space:
                return Err("Failed to update parking space")

            return Ok(updated_space)


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
                    address = COALESCE(%(addr)s, address),
                    location = ST_SetSRID(
                        ST_MakePoint(
                            COALESCE(%(long)s, ST_X(location::geometry)),
                            COALESCE(%(lat)s, ST_Y(location::geometry))
                        ), 4326
                    ),
                    name = COALESCE(%(name)s, name),
                    price = COALESCE(%(price)s, price),
                    availability_schedule = COALESCE(%(sched)s, availability_schedule),
                    updated_at = NOW()
                WHERE id = %(spot_id)s
                RETURNING
                    id,
                    is_paid, 
                    name,
                    verification_status, 
                    json_build_object(
                        'address', parking_spaces.address,
                        'latitude', ST_Y(location::geometry),
                        'longitude', ST_X(location::geometry)
                    ) as location,
                    json_build_object(
                        'base_price', price,
                        'dynamic_pricing', FALSE
                    ) as pricing_info,
                    availability_schedule,
                    photos,
                    created_at, 
                    updated_at,
                    CASE WHEN is_paid THEN COALESCE(avg_availability_rating, 0) ELSE NULL END AS avg_availability_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_cleanliness_rating, 0) ELSE NULL END AS avg_cleanliness_rating,
                    CASE WHEN is_paid THEN COALESCE(avg_total_rating, 0) ELSE NULL END AS avg_total_rating,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_availability, 0) ELSE NULL END AS ratings_count_availability,
                    CASE WHEN is_paid THEN COALESCE(ratings_count_cleanliness, 0) ELSE NULL END AS ratings_count_cleanliness
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

            # Adjust the output for paid parking spaces
            if parking_space["is_paid"]:
                if (
                    parking_space["ratings_count_availability"] == 0
                    or parking_space["ratings_count_availability"] is None
                ) and (
                    parking_space["ratings_count_cleanliness"] == 0
                    or parking_space["ratings_count_cleanliness"] is None
                ):
                    parking_space["avg_total_rating"] = "unrated"
                else:
                    parking_space["avg_total_rating"] = (
                        float(parking_space["avg_total_rating"])
                        if parking_space["avg_total_rating"] != 0
                        else "unrated"
                    )
                    parking_space["avg_availability_rating"] = (
                        float(parking_space["avg_availability_rating"])
                        if parking_space["avg_availability_rating"] != 0
                        else None
                    )
                    parking_space["avg_cleanliness_rating"] = (
                        float(parking_space["avg_cleanliness_rating"])
                        if parking_space["avg_cleanliness_rating"] != 0
                        else None
                    )
            else:
                # Remove rating fields for free spots
                parking_space.pop("avg_availability_rating", None)
                parking_space.pop("avg_cleanliness_rating", None)
                parking_space.pop("avg_total_rating", None)
                parking_space.pop("ratings_count_availability", None)
                parking_space.pop("ratings_count_cleanliness", None)

            return Ok(parking_space)


def delete_free_parking_space(
    user_id: uuid.UUID, parking_space_id: uuid.UUID
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM parking_spaces WHERE id = %s AND owner = %s AND is_paid = FALSE RETURNING photos",
                (parking_space_id, user_id),
            )

            result = cur.fetchone()
            if not result:
                return Err("Parking space not found")
            (photos,) = result

            # Delete the image files
            if photos:
                for photo in photos:
                    image_path = os.path.join(Config.BASE_FOLDER, photo.lstrip("/"))
                    if os.path.exists(image_path):
                        os.remove(image_path)

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


def submit_rating(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    availability_rating: Optional[int],
    cleanliness_rating: Optional[int],
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if parking space exists and is paid
            cur.execute(
                "SELECT is_paid FROM parking_spaces WHERE id = %s", (parking_space_id,)
            )
            result = cur.fetchone()

            if not result:
                return Err("Parking space does not exist")
            if not result[0]:
                return Err("Cannot rate a free parking space")

            cur.execute(
                """
                INSERT INTO ratings (user_id, parking_space_id, availability_rating, cleanliness_rating)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, parking_space_id) 
                DO UPDATE SET
                    availability_rating = COALESCE(EXCLUDED.availability_rating, ratings.availability_rating),
                    cleanliness_rating = COALESCE(EXCLUDED.cleanliness_rating, ratings.cleanliness_rating),
                    updated_at = NOW()
                """,
                (user_id, parking_space_id, availability_rating, cleanliness_rating),
            )
            return Ok(None)


def get_user_rating(
    user_id: uuid.UUID, parking_space_id: uuid.UUID
) -> Result[Dict[str, Any] | None, str]:
    """
    Fetches the availability and cleanliness ratings given by the user for a specific parking space.

    Args:
        user_id (uuid.UUID): The ID of the user.
        parking_space_id (uuid.UUID): The ID of the parking space.

    Returns:
        Result[Dict[str, Optional[int]], str]: A dictionary with 'availability_rating' and 'cleanliness_rating',
                                              or an error message.
    """
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Single SQL query to fetch the ratings
            cur.execute(
                """
                SELECT availability_rating, cleanliness_rating
                FROM ratings
                WHERE parking_space_id = %s AND user_id = %s
                """,
                (parking_space_id, user_id),
            )
            rating = cur.fetchone()
        return Ok(rating)


def bookmark_spot(
    user_id: uuid.UUID, parking_space_id: uuid.UUID
) -> Result[None, None]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO bookmarked_spots (parking_space_id, user_id)
                    VALUES (%s, %s)
                    """,
                    (parking_space_id, user_id),
                )
                return Ok(None)
            except UniqueViolation:
                return Err(None)


def remove_bookmarked_spot(
    user_id: uuid.UUID, parking_space_id: uuid.UUID
) -> Result[None, None]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                DELETE FROM bookmarked_spots WHERE parking_space_id = %s AND user_id = %s
            """,
                (parking_space_id, user_id),
            )
            if cur.rowcount != 1:
                return Err(None)
            else:
                return Ok(None)


def get_bookmarked_spots(user_id: uuid.UUID) -> Result[list[Dict[Any, Any]], None]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT parking_space_id, name,
                json_build_object(
                    'address', parking_spaces.address,
                    'latitude', ST_Y(parking_spaces.location::geometry),
                    'longitude', ST_X(parking_spaces.location::geometry)
                ) as location,
                bookmarked_spots.updated_at,
                bookmarked_spots.created_at
                FROM bookmarked_spots JOIN parking_spaces ON parking_space_id = parking_spaces.id
                WHERE bookmarked_spots.user_id = %s
            """,
                (user_id,),
            )
            return Ok(cur.fetchall())
