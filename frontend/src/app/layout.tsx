// app/layout.tsx

import "./globals.css"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import NavBarWrapper from "@/components/custom/nav-bar-wrapper"
import { Toaster } from "@/components/ui/toaster"
import NotificationBanner from "@/components/custom/NotificationBanner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Parking Pass",
  description: "Your solution to easy parking.",
}

//@ts-ignore
export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
