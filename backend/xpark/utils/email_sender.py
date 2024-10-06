import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from xpark.config import Config

def send_deletion_email(recipient_email: str, deletion_link: str) -> None:
    sender_email = "xparksthespot@gmail.com"
    sender_name = "XParks"
    sender_password = Config.SENDER_PASSWORD

    # SMTP configuration
    smtp_server = "smtp.gmail.com"
    smtp_port = 587

    # Email subject and body
    subject = "Confirm Account Deletion"
    body = f"""
    <html>
    <body>
        <p>Hi,<br>
           Please click the link below to confirm your account deletion:</p>
        <p><a href="{deletion_link}">Delete Account</a></p>
        <p>This link will expire in 30 minutes.</p>
    </body>
    </html>
    """

    # MIMEText for the message body
    message = MIMEMultipart()
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = recipient_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))

    try:
        # Connect to SMTP server
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # Secure the connection
            server.login(sender_email, sender_password)  # Log in to the email account

            # Send the email
            server.sendmail(sender_email, recipient_email, message.as_string())
            print(f"Deletion email sent to {recipient_email}")

    except Exception as e:
        print(f"Failed to send email: {str(e)}")
