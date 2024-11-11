import stripe
from xpark.config import Config
from result import Ok, Err, Result


def create_checkout_session(price: int) -> str:
    session = stripe.checkout.Session.create(
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": price,
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        ui_mode="embedded",
        return_url=Config.BASE_HOST
        + "/checkout/return?session_id={CHECKOUT_SESSION_ID}",  # the session ID is not a variable, but is instead going to be templated by stripe itself
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
