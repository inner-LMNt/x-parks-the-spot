import os
from typing import Dict, Any, List, Optional

from psycopg.rows import dict_row
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from xpark.utils.mailer import generate_templated_email, send_email
from xpark.config import Config
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
import json


def get_owned_parking_spaces(
    user_id: uuid.UUID,
) -> Result[Dict[str, List[Dict[str, Any]]], str]:
    """
    Fetches parking spaces owned by the user from the database and categorizes them.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT 
                        id, 
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
                    WHERE owner = %s
                """
                params = [str(user_id)]
                cur.execute(query, params)
                rows = cur.fetchall()

                # Retrieve column names
                col_names = [desc[0] for desc in cur.description] if cur.description is not None else []

                paidSpaces = []
                freeSpots = []
                pendingSpaces = []

                for row in rows:
                    row_dict = dict(zip(col_names, row))

                    parking_space = {
                        "id": str(row_dict["id"]),
                        "name": row_dict["name"] or "Unnamed Spot",
                        "is_paid": row_dict["is_paid"],
                        "status": row_dict["verification_status"] or "Pending",
                        "created_at": row_dict["created_at"].isoformat(),
                        "updated_at": row_dict["updated_at"].isoformat(),
                        "location": {
                            "latitude": float(row_dict["latitude"]),
                            "longitude": float(row_dict["longitude"]),
                            "address": row_dict["address"] or "",
                        },
                        "availability_schedule": row_dict["availability_schedule"]
                        or [],
                        "pricing_info": row_dict["pricing_info"] or {},
                        "photos": row_dict["photos"] or [],
                    }

                    # Categorize parking spaces
                    if parking_space["status"].upper() == "PENDING":
                        pendingSpaces.append(parking_space)
                    elif parking_space["is_paid"]:
                        paidSpaces.append(parking_space)
                    else:
                        freeSpots.append(parking_space)

                data = {
                    "paidSpaces": paidSpaces,
                    "freeSpots": freeSpots,
                    "pendingSpaces": pendingSpaces,
                }

                return Ok(data)
    except Exception as e:
        return Err(str(e))

def handle_verify_parking(parking_space_id: uuid.UUID, is_verified: bool) -> Result[Dict[str, Any], str]:
    try:
        # Step 1: Fetch the owner (user ID) of the parking space
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT owner FROM parking_spaces WHERE id = %s
                    """,
                    (str(parking_space_id),)
                )
                user_id_result = cur.fetchone()
                if not user_id_result:
                    return Err(f"Parking space with ID {parking_space_id} not found.")

                user_id = user_id_result[0]  # Extract user_id

        # Step 2: Update the parking space verification status
        verification_status = 'verified' if is_verified else 'rejected'

        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET verification_status = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, verification_status, updated_at
                    """,
                    (verification_status, str(parking_space_id)),
                )
                result = cur.fetchone()
                if not result:
                    return Err(f"Failed to update the verification status of parking space with ID {parking_space_id}.")

                updated_space = {
                    "id": str(result[0]),
                    "verification_status": result[1],
                    "updated_at": result[2].isoformat(),
                }

        # Step 3: Fetch the user's name and email by user ID
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT name, email FROM users WHERE id = %s
                    """,
                    (str(user_id),)
                )
                user_info_result = cur.fetchone()
                if not user_info_result:
                    return Err(f"User information not found for user ID {user_id}.")

                user_name = user_info_result[0]  # Extract user's name
                user_email = user_info_result[1]  # Extract user's email

        # Step 4: Send an email notification to the user
        if is_verified:
            try:
                send_email(
                    to=user_email,
                    subject="Parking spot verification successful",
                    content=generate_templated_email(
                        "spot_verified",
                        name=user_name  # Use the fetched user's name
                    ),
                )
            except Exception as email_error:
                return Err(f"Failed to send verification email: {str(email_error)}")
        else:
            try:
                send_email(
                    to=user_email,
                    subject="Parking spot verification rejected",
                    content=generate_templated_email(
                        "spot_rejected",
                        name=user_name  # Use the fetched user's name
                    ),
                )
            except Exception as email_error:
                return Err(f"Failed to send rejection email: {str(email_error)}")

        return Ok(updated_space)

    except Exception as e:
        # Capture any unexpected error and return it
        return Err(f"An unexpected error occurred during the verification process: {str(e)}")




def get_user_id_from_parking_space(parking_space_id: uuid.UUID) -> Result[uuid.UUID, str]:
    """
    Fetch the user ID (owner) of the parking space from the parking_space_id.
    """
    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT owner FROM parking_spaces WHERE id = %s", (str(parking_space_id),)
                )
                result = cur.fetchone()
                if not result:
                    return Err("Parking space not found.")
                return Ok(result[0])  # Return the user_id (owner)
    except Exception as e:
        return Err(f"Error fetching user ID: {str(e)}")


def handle_submit_verification(
    parking_space_id: uuid.UUID,
    image_file: Optional[FileStorage],
    user_id: uuid.UUID,
) -> Result[Dict[str, Any], str]:
    try:
        # Validate the image
        if image_file is None:
            return Err("No image provided for verification")

        # Save the image
        image_uri = save_image(image_file)

        # Update the parking space status to "pending" and store the image
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE parking_spaces
                    SET verification_status = %s, photos = array_append(photos, %s), updated_at = NOW()
                    WHERE id = %s AND owner = %s
                    RETURNING id, verification_status, photos, updated_at
                    """,
                    ('pending', image_uri, str(parking_space_id), str(user_id)),
                )
                result = cur.fetchone()
                if not result:
                    return Err("Failed to update verification status or parking space not found")

                # Parse the result
                updated_parking_space = {
                    "id": str(result[0]),
                    "verification_status": result[1],
                    "photos": result[2],
                    "updated_at": result[3].isoformat(),
                }

                conn.commit()
                return Ok(updated_parking_space)

    except Exception as e:
        return Err(str(e))


def create_parking_space(
    user_id: uuid.UUID,
    is_paid: bool,
    name: Optional[str],
    address: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    availability_schedule: Optional[list],
    pricing_info: Optional[Dict[str, Any]],
    photo_timestamp: Optional[str],
    image_file: Optional[FileStorage],
) -> Result[Dict[str, Any], str]:
    # Handle Image Saving
    photos = []
    if image_file:
        if not allowed_file(image_file.filename):
            return Err("Unsupported file type for image.")
        image_uri = save_image(image_file)
        if not image_uri:
            return Err("Failed to save image.")
        photos.append(image_uri)
    elif is_paid:
        return Err("Image is required for paid spots.")

    try:
        with DB.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO parking_spaces (
                        owner,
                        is_paid,
                        name,
                        location,
                        address,
                        availability_schedule,
                        pricing_info,
                        photos,
                        photo_timestamp,
                        verification_status,
                        dynamic_pricing_enabled,
                        cancellation_policy,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s,
                        'unverified', FALSE, 'standard', NOW(), NOW()
                    )
                    RETURNING
                        id,
                        is_paid,
                        verification_status,
                        name,
                        ST_Y(location::geometry) AS latitude,
                        ST_X(location::geometry) AS longitude,
                        address,
                        photos,
                        created_at,
                        updated_at,
                        pricing_info,
                        availability_schedule
                    """,
                    (
                        str(user_id),
                        is_paid,
                        name,
                        longitude,
                        latitude,
                        address,
                        json.dumps(availability_schedule) if availability_schedule else None,
                        json.dumps(pricing_info) if pricing_info else None,
                        photos,  # Pass the list directly, not as JSON
                        photo_timestamp,
                    ),
                )
                result = cur.fetchone()

                if not result:
                    return Err("Failed to create parking space.")

                columns = [
                    'id', 'is_paid', 'verification_status', 'name',
                    'latitude', 'longitude', 'address', 'photos',
                    'created_at', 'updated_at',
                    'pricing_info', 'availability_schedule'
                ]
                parking_space = dict(zip(columns, result))

                # Format location data
                parking_space['location'] = {
                    "latitude": parking_space.pop('latitude'),
                    "longitude": parking_space.pop('longitude'),
                    "address": parking_space.pop('address')
                }

                return Ok(parking_space)

    except Exception as e:
        print(f"Exception in create_parking_space: {e}")
        return Err("An unexpected error occurred while creating the parking space.")

def allowed_file(filename: str) -> bool:
    allowed_extensions = {"png", "jpg", "jpeg", "gif"}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def save_image(image_file: FileStorage) -> Optional[str]:
    try:
        filename = secure_filename(image_file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        images_dir = os.path.join(Config.STATIC_FOLDER, "images")
        os.makedirs(images_dir, exist_ok=True)
        filepath = os.path.join(images_dir, unique_filename)
        image_file.save(filepath)
        image_uri = f"/static/images/{unique_filename}"
        return image_uri
    except Exception as e:
        # Log the exception as needed
        print(f"Error saving image: {e}")
        return None

def get_parking_space(parking_space_id: uuid.UUID) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, owner, is_paid, name, ST_X(location::geometry) AS longitude,
                       ST_Y(location::geometry) AS latitude, features, availability_schedule,
                       pricing_info, photos, verification_status, dynamic_pricing_enabled,
                       cancellation_policy, created_at, updated_at
                FROM parking_spaces
                WHERE id = %s
                """,
                (parking_space_id,),
            )
            result = cur.fetchone()
            if result:
                (
                    id,
                    owner_id,
                    is_paid,
                    name,
                    longitude,
                    latitude,
                    features,
                    availability_schedule,
                    pricing_info,
                    photos,
                    verification_status,
                    dynamic_pricing_enabled,
                    cancellation_policy,
                    created_at,
                    updated_at,
                ) = result

                parking_space = {
                    "id": str(id),
                    "owner_id": str(owner_id),
                    "is_paid": is_paid,
                    "name": name,
                    "location": {
                        "latitude": latitude,
                        "longitude": longitude,
                    },
                    "features": features,
                    "availability_schedule": availability_schedule,
                    "pricing_info": pricing_info,
                    "photos": photos,
                    "verification_status": verification_status,
                    "dynamic_pricing_enabled": dynamic_pricing_enabled,
                    "cancellation_policy": cancellation_policy,
                    "created_at": created_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                }
                return Ok(parking_space)
            else:
                return Err("Parking space not found")


def update_parking_space(
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID,
    name: str,
    address: str,
    latitude: float,
    longitude: float,
    availability_schedule: list[Dict[str, str]],
    price_per_hour: float,
    reverification_required: bool,
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
            new_status = "unverified" if reverification_required else None
            cur.execute(
                """
                UPDATE parking_spaces SET
                name = COALESCE(%(name)s, name),
                address = COALESCE(%(address)s, address),
                location = ST_MakePoint(COALESCE(%(longitude)s, ST_X(location::geometry))
                            , COALESCE(%(latitude)s, ST_Y(location::geometry))),
                availability_schedule = COALESCE(%(availability_schedule)s, availability_schedule), 
                pricing_info = COALESCE(%(pricing_info)s, pricing_info), 
                updated_at = NOW(),
                verification_status = COALESCE(%(new_status)s, verification_status)
                WHERE id = %(id)s
                RETURNING
                    id,
                    is_paid, 
                    verification_status, 
                    name,
                    ST_Y(location::geometry) AS latitude, 
                    ST_X(location::geometry) AS longitude, 
                    address, 
                    photos,
                    created_at, 
                    updated_at,
                    pricing_info,
                    availability_schedule
                """,
                {
                 "name": name,
                 "address": address,
                 "latitude": latitude,
                 "longitude": longitude,
                 "availability_schedule": json.dumps(availability_schedule) if availability_schedule else None,
                 "pricing_info": json.dumps({"base_price": price_per_hour}) if price_per_hour else None,
                 "new_status": new_status,
                 "id": parking_space_id

                }
            )
            parking_space = cur.fetchone()

            if not parking_space:
                return Err("Failed to update parking space")
            parking_space['location'] = {"latitude": parking_space['latitude'],
                                         "longitude": parking_space['longitude'],
                                         "address": parking_space['address']}
            del parking_space['latitude']
            del parking_space['longitude']
            del parking_space['address']

            return Ok(parking_space)


def delete_parking_space(
    user_id: uuid.UUID, parking_space_id: uuid.UUID
) -> Result[None, str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            # Check if parking space exists and if the user is the owner
            cur.execute(
                "SELECT owner FROM parking_spaces WHERE id = %s",
                (parking_space_id,),
            )
            result = cur.fetchone()
            if not result:
                return Err("Parking space not found")
            (owner_id,) = result
            if owner_id != user_id:
                return Err("User not authorized to delete this parking space")

            # Delete the parking space
            cur.execute(
                "DELETE FROM parking_spaces WHERE id = %s",
                (parking_space_id,),
            )
            conn.commit()
            return Ok(None)
