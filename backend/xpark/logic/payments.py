import stripe
from xpark.config import Config
from result import Ok, Err, Result
import uuid
from psycopg import Cursor
from psycopg.rows import DictRow
import time
from xpark.utils.db import DB
from psycopg.rows import dict_row


def create_checkout_session(
    cur: Cursor[DictRow],
    user_id: uuid.UUID,
    owner_id: uuid.UUID,
    spot_id: uuid.UUID,
    price: int,
) -> str:
    # Get user email
    # Check if the email already exists in the database
    cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
    email_c = cur.fetchone()
    assert email_c
    email = email_c["email"]
    cur.execute("SELECT stripe_account_id FROM users WHERE id = %s", (owner_id,))
    stripe_account_id_c = cur.fetchone()
    assert stripe_account_id_c
    stripe_account_id = stripe_account_id_c["stripe_account_id"]
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
        payment_intent_data={
            "application_fee_amount": price // 10,
            "transfer_data": {"destination": stripe_account_id},
        },
        mode="payment",
        ui_mode="embedded",
        return_url=Config.BASE_HOST
        # + f"/bookings/{spot_id}/reserve/confirm?session_id={{CHECKOUT_SESSION_ID}}",
        + "/bookings",
        # saved_payment_method_options={"payment_method_save": "enabled"},
        customer_email=email,
        expires_at=int(time.time()) + 30 * 60,  # 30 minutes from now
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


# def fulfill_checkout(session_id):
#     # TODO: Make this function safe to run multiple times,
#     # even concurrently, with the same session ID
#
#     # TODO: Make sure fulfillment hasn't already been
#     # peformed for this Checkout Session
#
#     # Retrieve the Checkout Session from the API with line_items expanded
#     checkout_session = stripe.checkout.Session.retrieve(
#         session_id,
#         expand=["line_items"],
#     )
#
#     # Check the Checkout Session's payment_status property
#     # to determine if fulfillment should be peformed
#     if checkout_session.payment_status != "unpaid":
#         # TODO: Perform fulfillment of the line items
#
#         # TODO: Record/save fulfillment status for this
#         # Checkout Session
#         ...


def connect_account(user_id: uuid.UUID) -> Result[str, str]:
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT stripe_account_id FROM users WHERE id = %s", (user_id,))
            c = cur.fetchone()
            assert c
            if c.get("stripe_account_id") is None:
                print("creating new")
                try:
                    acc = stripe.Account.create(
                        controller={
                            "stripe_dashboard": {
                                "type": "none",
                            },
                            "fees": {"payer": "application"},
                            "losses": {"payments": "application"},
                            "requirement_collection": "application",
                        },
                        capabilities={
                            "transfers": {"requested": True},
                        },
                        country="US",
                    )
                    account_id = acc.id
                except Exception as e:
                    return Err(str(e))

                cur.execute(
                    "UPDATE users SET stripe_account_id = %s WHERE id = %s",
                    (account_id, user_id),
                )
            else:
                print("reusing account")
                account_id = c["stripe_account_id"]

            print(account_id)
            return Ok(account_id)


def create_account_session(account_id: str) -> Result[str, str]:
    try:
        session = stripe.AccountSession.create(
            account=account_id,
            # refresh_url=Config.BASE_HOST + "/verifyowner",
            # return_url=Config.BASE_HOST + "/bookings",
            # type="account_onboarding",
            components={
                "account_onboarding": {
                    "enabled": True,
                    "features": {"external_account_collection": True},
                },
                "balances": {
                    "enabled": True,
                    "features": {
                        "instant_payouts": True,
                        "standard_payouts": True,
                        "edit_payout_schedule": True,
                    },
                },
            },
        )

        return Ok(session.client_secret)
    except Exception as e:
        return Err(str(e))
