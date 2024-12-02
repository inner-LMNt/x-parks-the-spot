import "./globals.css"
import { Inter } from "next/font/google"
import { Metadata } from "next"
import { Providers } from "./providers"
import NavBarWrapper from "@/components/custom/nav-bar-wrapper"
import { Toaster } from "@/components/ui/toaster"
import NotificationBanner from "@/components/custom/NotificationBanner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "X Parks the Spot",
  description: "Parking anywhere. Rent and find paid or free spots.",
  viewport: {
    width: "device-width",
    height: "device-height",
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: false, // Disable pinch-zooming
  },
  themeColor: "#e2e8f0", // Sets the theme color for status bar
  icons: {
    icon: "/icon512_rounded.png", // Default icon
    apple: "/icon512_maskable.png", // Apple devices
    other: [
      {
        rel: "manifest",
        url: "/manifest.json",
      },
    ],
  },
  manifest: "/manifest.json", // Specify the manifest file path
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
