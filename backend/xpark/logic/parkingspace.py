import os
from typing import Dict, Any, List, Optional

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

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
                col_names = [desc[0] for desc in cur.description]

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


def create_parking_space(
    user_id: uuid.UUID,
    data: Optional[str],
    image_file: Optional[FileStorage],
) -> Result[Dict[str, Any], str]:
    try:
        if not data:
            return Err("Missing data")

        data_dict = json.loads(data)

        # Extract and validate required fields
        is_paid = data_dict.get("is_paid", False)
        location = data_dict.get("location", {})
        latitude = location.get("latitude")
        longitude = location.get("longitude")
        address = location.get("address")

        if latitude is None or longitude is None or address is None:
            return Err("Missing location information")

        # For paid spots, 'name', 'availability_schedule', and 'pricing_info' are required
        name = data_dict.get("name", "") if is_paid else ""
        features = data_dict.get("features", [])
        availability_schedule = data_dict.get("availability_schedule", [])
        pricing_info = data_dict.get("pricing_info", {})

        if is_paid:
            if not name:
                return Err("Name is required for paid spots")
            if not availability_schedule:
                return Err("Availability schedule is required for paid spots")
            if not pricing_info or "base_price" not in pricing_info:
                return Err("Pricing info with base_price is required for paid spots")

        # Optional fields with defaults
        verification_status = data_dict.get("verification_status", "unverified")
        dynamic_pricing_enabled = data_dict.get("dynamic_pricing_enabled", False)
        cancellation_policy = data_dict.get("cancellation_policy", "standard")

        # Handle image saving
        if image_file:
            image_uri = save_image(image_file)
            photos = [image_uri]
        else:
            photos = []

        # Prepare data for database insertion
        parking_space_data = {
            "owner_id": user_id,
            "is_paid": is_paid,
            "name": name,
            "latitude": latitude,
            "longitude": longitude,
            "address": address,
            "features": features,
            "availability_schedule": availability_schedule,
            "pricing_info": pricing_info,
            "photos": photos,
            "verification_status": verification_status,
            "dynamic_pricing_enabled": dynamic_pricing_enabled,
            "cancellation_policy": cancellation_policy,
        }

        # Insert into database
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
                        features,
                        availability_schedule,
                        pricing_info,
                        photos,
                        verification_status,
                        dynamic_pricing_enabled,
                        cancellation_policy
                    )
                    VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at, updated_at
                    """,
                    (
                        parking_space_data["owner_id"],
                        parking_space_data["is_paid"],
                        parking_space_data["name"],
                        parking_space_data["longitude"],
                        parking_space_data["latitude"],
                        parking_space_data["address"],
                        parking_space_data["features"],
                        (
                            json.dumps(parking_space_data["availability_schedule"])
                            if parking_space_data["availability_schedule"]
                            else None
                        ),
                        (
                            json.dumps(parking_space_data["pricing_info"])
                            if parking_space_data["pricing_info"]
                            else None
                        ),
                        parking_space_data["photos"],
                        parking_space_data["verification_status"],
                        parking_space_data["dynamic_pricing_enabled"],
                        parking_space_data["cancellation_policy"],
                    ),
                )
                result = cur.fetchone()
                parking_space_id, created_at, updated_at = result
                conn.commit()

                # Construct the response object
                parking_space = {
                    "id": str(parking_space_id),
                    "owner_id": str(user_id),
                    "is_paid": is_paid,
                    "name": name,
                    "location": {
                        "latitude": latitude,
                        "longitude": longitude,
                        "address": address,
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

    except Exception as e:
        return Err(str(e))


def save_image(image_file) -> str:
    allowed_extensions = {"png", "jpg", "jpeg", "gif"}
    filename = secure_filename(image_file.filename)
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
    user_id: uuid.UUID, parking_space_id: uuid.UUID, updates: Dict[str, Any]
) -> Result[Dict[str, Any], str]:
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
                return Err("User not authorized to update this parking space")

            # Build SET clause dynamically
            allowed_fields = {
                "is_paid",
                "name",
                "features",
                "availability_schedule",
                "pricing_info",
                "photos",
                "verification_status",
                "dynamic_pricing_enabled",
                "cancellation_policy",
            }
            set_clauses = []
            values = []
            for key, value in updates.items():
                if key in allowed_fields:
                    set_clauses.append(f"{key} = %s")
                    if key in ["availability_schedule", "pricing_info"]:
                        values.append(json.dumps(value))
                    else:
                        values.append(value)
            if not set_clauses:
                return Err("No valid fields to update")

            values.append(parking_space_id)

            query = f"""
                UPDATE parking_spaces
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, owner, is_paid, name, ST_X(location::geometry) AS longitude,
                          ST_Y(location::geometry) AS latitude, features, availability_schedule,
                          pricing_info, photos, verification_status, dynamic_pricing_enabled,
                          cancellation_policy, created_at, updated_at
            """
            cur.execute(query, values)
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
                conn.commit()
                return Ok(parking_space)
            else:
                return Err("Failed to update parking space")


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
