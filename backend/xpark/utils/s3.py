from mypy_boto3_s3.service_resource import S3ServiceResource
import magic
from xpark.config import Config
import uuid
from werkzeug.datastructures import FileStorage
import boto3


class S3:
    conn: S3ServiceResource

    @staticmethod
    def save_image(image_file: FileStorage) -> str:
        # Check extension with magic
        mime = magic.from_buffer(image_file.read(2048), mime=True)
        # Reset seek before uploading stream
        image_file.seek(0)
        if mime.split("/")[0] == "image":
            unique_filename = f"{uuid.uuid4()}"
            image_uri = f"{Config.S3_ENDPOINT}/{Config.S3_BUCKET}/{unique_filename}"
            # Upload file with correct file type
            if Config.S3_ENABLED == "yes":
                S3.conn.Bucket(Config.S3_BUCKET).upload_fileobj(
                    image_file.stream,
                    unique_filename,
                    ExtraArgs={"ContentType": mime},
                )
            return image_uri
        else:
            raise ValueError("Invalid image file type")

    @staticmethod
    def connect() -> None:
        S3.conn = boto3.resource(
            "s3",
            endpoint_url=Config.S3_ENDPOINT,
            aws_access_key_id=Config.S3_ACCESS_KEY,
            aws_secret_access_key=Config.S3_SECRET_KEY,
        )
