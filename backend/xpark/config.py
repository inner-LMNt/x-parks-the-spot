import os
from dotenv import load_dotenv

load_dotenv()
basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]  # Will fail if SECRET_KEY is not set
    DATABASE_URI = os.environ["DATABASE_URI"]
    TOKEN_EXPIRY_SECONDS = 2592000
    TOKEN_PREFIX = "xpark_"
    BASE_HOST = os.environ.get("BASE_HOST") or "http://localhost:3000"

    TEST_DATABASE_URI = (
        os.environ.get("TEST_DATABASE_URI")
        or "user=admin password=password host=127.0.0.1 port=5432"
    )
    TEST_DATABASE_NAME = os.environ.get("TEST_DATABASE_NAME") or "test_xpark"
    ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN") or "*"
    ALLOWED_HEADERS = (
        os.environ.get("ALLOWED_HEADERS") or "Authorization, X-PINGOTHER, Content-Type"
    )
    ALLOWED_METHODS = os.environ.get("ALLOWED_METHODS") or "*"

    SMTP_FROM = os.environ.get("SMTP_FROM") or '"NoReply" <noreply@example.com>'
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME") or "noreply@example.com"
    SMTP_TLS = os.environ.get("SMTP_TLS") or "no"
    SMTP_HOST = os.environ.get("SMTP_HOST") or "localhost"
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD") or ""
    SMTP_ENABLED = os.environ.get("SMTP_ENABLED")
