import stripe
from xpark.config import Config
from result import Ok, Err, Result
import uuid
from psycopg import Cursor
from psycopg.rows import DictRow


def create_checkout_session(
    cur: Cursor[DictRow], user_id: uuid.UUID, price: int
) -> str:
    # Get user email
    # Check if the email already exists in the database
    cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
    email = cur.fetchone()
    assert email
    email = email["email"]
    session = stripe.checkout.Session.create(
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": price,
                    "product_data": {
                        "name": "Parking Spot",
                    },
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        ui_mode="embedded",
        return_url=Config.BASE_HOST
        + "/bookings?session_id={CHECKOUT_SESSION_ID}",  # the session ID is not a variable, but is instead going to be templated by stripe itself
        # saved_payment_method_options={"payment_method_save": "enabled"},
        customer_email=email,
        # customer_creation="always",
    )

    assert session.client_secret

    # TODO: Lock parking spot

    return session.client_secret


def get_session_status(session_id: str) -> Result[str, None]:
    session = stripe.checkout.Session.retrieve(session_id)

    if not session.status:
        return Err(None)

    return Ok(session.status)


def fulfill_checkout(session_id):
    # TODO: Make this function safe to run multiple times,
    # even concurrently, with the same session ID

    # TODO: Make sure fulfillment hasn't already been
    # peformed for this Checkout Session

    # Retrieve the Checkout Session from the API with line_items expanded
    checkout_session = stripe.checkout.Session.retrieve(
        session_id,
        expand=["line_items"],
    )

    # Check the Checkout Session's payment_status property
    # to determine if fulfillment should be peformed
    if checkout_session.payment_status != "unpaid":
        # TODO: Perform fulfillment of the line items

        # TODO: Record/save fulfillment status for this
        # Checkout Session
        ...
