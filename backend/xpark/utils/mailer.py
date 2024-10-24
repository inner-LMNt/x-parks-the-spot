import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import charset
from xpark.config import Config
import os
import sys
from pathlib import Path
from typing import cast, Union
from string import Template
from threading import Lock

reconnect_lock = Lock()

MAILTEMPLATE_BASEDIR = os.path.join(
    cast(Path, os.path.dirname(str(sys.modules["xpark"].__file__))), "mail_templates"
)


class SMTPConn:
    conn: Union[smtplib.SMTP, smtplib.SMTP_SSL]


def send_email(to: str, subject: str, content: str) -> None:
    email = MIMEMultipart("mixed")
    cs_ = charset.Charset("utf-8")
    cs_.header_encoding = charset.QP
    cs_.body_encoding = charset.QP
    email.set_charset(cs_)

    plain = MIMEText(content, "plain", "utf-8")
    inline = MIMEMultipart("alternative")
    inline.attach(plain)
    email.attach(inline)

    email["Subject"] = subject
    email["From"] = Config.SMTP_FROM
    email["To"] = to

    if Config.SMTP_ENABLED:
        try:
            SMTPConn.conn.send_message(email)
        except smtplib.SMTPServerDisconnected:
            connect()
            SMTPConn.conn.send_message(email)


def connect() -> None:
    # The lock should prevent race condition if two emails are sent, both require reconnects
    # I don't see it happening, but just in case, I guess
    with reconnect_lock:
        SMTPConn.conn.connect(host=Config.SMTP_HOST)
        SMTPConn.conn.login(user=Config.SMTP_USERNAME, password=Config.SMTP_PASSWORD)
        SMTPConn.conn.ehlo() # Why doesn't this automatically get sent on reconnect?


def generate_templated_email(template: str, **kwargs: str) -> str:
    with open(os.path.join(MAILTEMPLATE_BASEDIR, template), "r") as f:
        # FIXME: Sanitize and escape
        src = Template(f.read())
        return src.substitute(kwargs)
