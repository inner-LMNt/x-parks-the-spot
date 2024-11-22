import * as React from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js"
import { Reservation } from "@/types/type"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK || "")

export interface PaymentPageProps {
  reservation: Reservation
}

export default function PaymentPage({ reservation }: PaymentPageProps) {
  const clientSecret = reservation.checkout_secret
  const options = { clientSecret }
  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
