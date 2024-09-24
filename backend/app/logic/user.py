from app.utils.db import pool, token_cache
from app.utils.password import password_hasher
import uuid
import secrets
from app.config import Config
from result import Result, Ok, Err


def check_if_user_exists(email: str) -> bool:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(1) from users WHERE email = %s", (email,))
            return cur.fetchone() != (0,)

# If it returns None, then the user already exists
def create_user(name: str, email: str, password: str) -> Result[uuid.UUID, str]:
    if check_if_user_exists(email):
        return Err("Email already exists")

    # If it doesn't exist, then continue creating the user
    hash = password_hasher.hash(password)
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (name, email, hash),
            )
            new_user = cur.fetchone()
            assert new_user != None
            return Ok(new_user[0])

def check_username_password(email: str, password: str) -> Result[uuid.UUID, str]:
    if not check_if_user_exists(email):
        return Err("Wrong Password")

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, password_hash from users WHERE email = %s", (email,))
            correct_hashed_password = cur.fetchone()
            assert correct_hashed_password != None # We know it'll return something because the email exists
            user_id = correct_hashed_password[0] # Extract the tuple value
            correct_hashed_password = correct_hashed_password[1] # Extract the tuple value

            if password_hasher.verify(correct_hashed_password, password):
                return Ok(user_id)
            else:
                return Err("Wrong Password")


def create_token(user_id: uuid.UUID) -> str:
    token = Config.TOKEN_PREFIX + secrets.token_urlsafe(32)
    token_cache.set(token, user_id.bytes, ex=Config.TOKEN_EXPIRY_SECONDS)
    return token


def validate_token_and_refresh(token) -> Result[uuid.UUID, str]:
    # Check if token exists
    # If it does, refresh it
    uuid_ret = token_cache.getex(token, ex=Config.TOKEN_EXPIRY_SECONDS)
    if uuid_ret != None:
        return Ok(uuid.UUID(bytes=uuid_ret))
    return Err("Token expired")


# TODO: Delete all keys for a user
