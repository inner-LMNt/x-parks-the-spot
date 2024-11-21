// components/NavBarWrapper.jsx

"use client" // This directive makes the component a Client Component

import { usePathname } from "next/navigation"
import { BottomNavBar } from "@/components/custom/bottom-nav-bar"

const NavBarWrapper = () => {
  const pathname = usePathname()

  // Define the routes where the BottomNavBar should appear
  const navBarPaths = [
    "/profile",
    "/myspots",
    "/search",
    "/add",
    "/bookings",
    "/cars",
    "/bookmarks",
  ]

  // Determine if the current path is in the list
  const shouldShowNavBar = pathname !== null && navBarPaths.includes(pathname)

  // Render the BottomNavBar only if shouldShowNavBar is true
  return shouldShowNavBar ? <BottomNavBar /> : null
}

export default NavBarWrapper
