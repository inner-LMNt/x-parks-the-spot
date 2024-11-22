import { loadConnectAndInitialize } from "@stripe/connect-js"
import { useDispatch } from "react-redux"
import { create_account_session } from "@/features/user/userSlice"
import { useState, useEffect } from "react"

export const useStripeConnect = (connectedAccountId) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState()
  const dispatch = useDispatch()

  useEffect(() => {
    if (connectedAccountId) {
      // const fetchClientSecret = async () => {
      //   const response = await fetch("/account_session", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       account: connectedAccountId,
      //     }),
      //   })
      //
      //   if (!response.ok) {
      //     // Handle errors on the client side here
      //     const { error } = await response.json()
      //     throw ("An error occurred: ", error)
      //   } else {
      //     const { client_secret: clientSecret } = await response.json()
      //     return clientSecret
      //   }
      // }
      const fetchClientSecret = async () => {
        return await dispatch(create_account_session()).unwrap()
      }

      setStripeConnectInstance(
        loadConnectAndInitialize({
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PK,
          fetchClientSecret,
          appearance: {
            overlays: "dialog",
            variables: {
              colorPrimary: "#635BFF",
            },
          },
        }),
      )
    }
  }, [connectedAccountId])

  return stripeConnectInstance
}

export default useStripeConnect
