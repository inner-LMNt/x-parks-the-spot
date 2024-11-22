"use client"

import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import ProfilePage from "./ProfilePage"
import { store } from "@/store"
import { login, logout } from "@/features/user/userSlice"
import { AuthResponse } from "@/types/type"
import { injectStore } from "@/api/axiosInstance"
import { Provider } from "react-redux"
import { ToastProvider } from "@/components/ui/toast"

describe.skip("ProfilePage", () => {
  const mockUser = {
    email: "xparkusr1@gmail.com",
    password: "Xp4rK!usrP@swrD",
  }

  beforeEach(async () => {
    let authToken
    const result = (await store.dispatch(
      //@ts-ignore
      login(mockUser),
    )) as { payload: AuthResponse }

    // Store auth token for reference/debugging
    authToken = result.payload.access_token

    // Verify login success and token presence
    await waitFor(
      () => {
        const state = store.getState()
        expect(state.user.isLoggedIn).toBeTruthy()
        expect(state.user.access_token).toBe(authToken)
        expect(state.user.error).toBeNull()
      },
      { timeout: 10000 },
    )

    // Optional: Log token for debugging
    console.log("Auth token for test:", authToken)
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await store.dispatch(
      //@ts-ignore
      logout(),
    )
  })
  const renderWithStore = (component: React.ReactNode) => {
    injectStore(store)
    return render(
      <Provider store={store}>
        <ToastProvider>{component}</ToastProvider>
      </Provider>,
    )
  }

  const waitForLoad = async () => {
    // Wait for minimum 300ms AND loading false
    await new Promise((resolve) => setTimeout(resolve, 300))
    await waitFor(
      () => {
        const state = store.getState()
        expect(state.user.loading).toBe(false)
      },
      { timeout: 5000 },
    )
  }

  it("renders the profile header with correct points", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    // Total points and current points from state
    const totalPoints = screen.getByText("10000000")
    const currentPoints = screen.getByText("9967250")
    expect(totalPoints).toBeInTheDocument()
    expect(currentPoints).toBeInTheDocument()
  })

  it("renders profile stats with correct values", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    // These values come from hardcoded userProfile in the component
    expect(screen.getByText("1200")).toBeInTheDocument() // Rating
    expect(screen.getByText("50")).toBeInTheDocument() // Posts
    expect(screen.getByText("2")).toBeInTheDocument() // Years
  })

  it("renders the badges section with all badge levels", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    // Check for all badge labels that should be rendered based on [1,2,3]
    expect(screen.getByText(/bronze badge/i)).toBeInTheDocument()
    expect(screen.getByText(/silver badge/i)).toBeInTheDocument()
    expect(screen.getByText(/gold badge/i)).toBeInTheDocument()
  })

  it("renders the raffle tickets section with correct count", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    expect(screen.getByText(/0 tickets/i)).toBeInTheDocument()
    expect(screen.getByText(/tickets are drawn/i)).toBeInTheDocument()
    // Check countdown timer exists
    expect(screen.getByText(/\d+d \d+h \d+m \d+s/)).toBeInTheDocument()
  })

  it("renders all comments", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    // Check all hardcoded comments exist
    expect(screen.getByText("Logged many spots!")).toBeInTheDocument()
    expect(screen.getByText("Found a great spot, thanks!")).toBeInTheDocument()
    expect(
      screen.getByText("Logged a spot that was on private property"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Helpful and friendly service!"),
    ).toBeInTheDocument()
  })

  it("handles the logout flow", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    const logoutButton = screen.getByRole("button", { name: /logout/i })
    fireEvent.click(logoutButton)

    // Check dialog appears
    expect(
      screen.getByText(/are you sure you want to logout\?/i),
    ).toBeInTheDocument()

    // Verify both buttons exist
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
  })

  it("shows all navigation links with correct hrefs", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    // Check all navigation links exist with correct hrefs
    const links = screen.getAllByRole("link")
    expect(
      links.find((link) => link.getAttribute("href") === "/reports"),
    ).toBeInTheDocument()
    expect(
      links.find((link) => link.getAttribute("href") === "/cars"),
    ).toBeInTheDocument()
    expect(
      links.find((link) => link.getAttribute("href") === "/settings"),
    ).toBeInTheDocument()
    expect(
      links.find((link) => link.getAttribute("href") === "/bookmarks"),
    ).toBeInTheDocument()
  })

  it("shows all star rating icons", async () => {
    renderWithStore(<ProfilePage />)
    await waitForLoad()

    // Count star icons - should be 5 stars
    const stars = screen.getAllByTitle(/star/i)
    expect(stars).toHaveLength(5)
  })
})
