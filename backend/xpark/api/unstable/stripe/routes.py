from . import bp
from typing import Tuple, Any
import stripe
from flask import request
from xpark.config import Config


@bp.post("webhook")
def webhook() -> Tuple[Any, int]:
    event = None
    assert request.data
    assert request.json
    sig_header = request.headers["Stripe-Signature"]
    try:
        event = stripe.Webhook.construct_event(  # type: ignore
            request.data, sig_header, Config.STRIPE_ENDPOINT_SECRET
        )
    except ValueError:
        return {"err": "invalid payload"}, 400
    except stripe.SignatureVerificationError as e:
        return {"err": f"Error verifying webhook signature: {e}"}, 403

    match event.type:
        case "payment_intent.succeeded":
            ...
            # payment_intent = event.data.object  # contains a stripe.PaymentIntent
            # Then define and call a method to handle the successful payment intent.
            # handle_payment_intent_succeeded(payment_intent)
        case "payment_method.attached":
            ...
            # Then define and call a method to handle the successful attachment of a PaymentMethod.
            # handle_payment_method_attached(payment_method)
        case _:
            return {"err": "unhandled event type"}, 400

    return {}, 200


@bp.get("status")
def session_status() -> Tuple[Any, int]:
    session = stripe.checkout.Session.retrieve(request.args["session_id"])
    return (
        {
            "status": session.status,
            "customer_email": session.customer_details.email,  # type: ignore
        },
        200,
    )
