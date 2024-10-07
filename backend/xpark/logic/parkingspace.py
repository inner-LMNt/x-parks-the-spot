from typing import Dict, Any
from xpark.utils.db import DB
from result import Result, Ok, Err
import uuid
import json

def create_parking_space(
    owner_id: uuid.UUID,
    is_paid: bool,
    name: str,
    latitude: float,
    longitude: float,
    features: list[str],
    availability_schedule: list[Dict[str, Any]],
    pricing_info: Dict[str, Any],
    photos: list[str],
    verification_status: str,
    dynamic_pricing_enabled: bool,
    cancellation_policy: str
) -> Result[Dict[str, Any], str]:
    with DB.pool.connection() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO parking_spaces (
                        owner,
                        is_paid,
                        name,
                        location,
                        features,
                        availability_schedule,
                        pricing_info,
                        photos,
                        verification_status,
                        dynamic_pricing_enabled,
                        cancellation_policy
                    )
                    VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at, updated_at
                    """,
                    (
                        owner_id,
                        is_paid,
                        name,
                        longitude,
                        latitude,
                        features,
                        json.dumps(availability_schedule),
                        json.dumps(pricing_info),
                        photos,
                        verification_status,
                        dynamic_pricing_enabled,
                        cancellation_policy
                    ),
                )
                result = cur.fetchone()
                parking_space_id, created_at, updated_at = result

                parking_space = {
                    'id': str(parking_space_id),
                    'owner_id': str(owner_id),
                    'is_paid': is_paid,
                    'name': name,
                    'location': {
                        'latitude': latitude,
                        'longitude': longitude,
                    },
                    'features': features,
                    'availability_schedule': availability_schedule,
                    'pricing_info': pricing_info,
                    'photos': photos,
                    'verification_status': verification_status,
                    'dynamic_pricing_enabled': dynamic_pricing_enabled,
                    'cancellation_policy': cancellation_policy,
                    'created_at': created_at.isoformat(),
                    'updated_at': updated_at.isoformat(),
                }
                conn.commit()
                return Ok(parking_space)

            except Exception as e:
                conn.rollback()
                return Err(str(e))

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
                    id, owner_id, is_paid, name, longitude, latitude, features,
                    availability_schedule, pricing_info, photos, verification_status,
                    dynamic_pricing_enabled, cancellation_policy, created_at, updated_at
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
    updates: Dict[str, Any]
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
            owner_id, = result
            if owner_id != user_id:
                return Err("User not authorized to update this parking space")

            # Build SET clause dynamically
            allowed_fields = {
                'is_paid', 'name', 'features', 'availability_schedule', 'pricing_info',
                'photos', 'verification_status', 'dynamic_pricing_enabled', 'cancellation_policy'
            }
            set_clauses = []
            values = []
            for key, value in updates.items():
                if key in allowed_fields:
                    set_clauses.append(f"{key} = %s")
                    if key in ['availability_schedule', 'pricing_info']:
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
                    id, owner_id, is_paid, name, longitude, latitude, features,
                    availability_schedule, pricing_info, photos, verification_status,
                    dynamic_pricing_enabled, cancellation_policy, created_at, updated_at
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
    user_id: uuid.UUID,
    parking_space_id: uuid.UUID
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
            owner_id, = result
            if owner_id != user_id:
                return Err("User not authorized to delete this parking space")

            # Delete the parking space
            cur.execute(
                "DELETE FROM parking_spaces WHERE id = %s",
                (parking_space_id,),
            )
            conn.commit()
            return Ok(None)
