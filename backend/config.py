import os
from dotenv import load_dotenv

load_dotenv()
basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]  # Will fail if SECRET_KEY is not set
    DATABASE_URI = os.environ["DATABASE_URI"]
    REDIS_URI = os.environ["REDIS_URI"]
    TOKEN_EXPIRY_SECONDS = 2592000
    TOKEN_PREFIX = "xpark_"
