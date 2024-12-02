import "./globals.css"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import NavBarWrapper from "@/components/custom/nav-bar-wrapper"
import { Toaster } from "@/components/ui/toaster"
import NotificationBanner from "@/components/custom/NotificationBanner"
import Head from "next/head"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Parking Pass",
  description: "Your solution to easy parking.",
}

//@ts-ignore
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, height=device-height, user-scalable=no"
        />
        <meta name="theme-color" content="#ff9238" />
        <meta name="description" content="Your solution to easy parking." />
        <link rel="manifest" href="/manifest.ts" />
        <link rel="icon" href="/icon512_rounded.png" />
      </Head>
      <body className={inter.className}>
        <Providers>
          <NotificationBanner />
          {children}
          <NavBarWrapper />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
