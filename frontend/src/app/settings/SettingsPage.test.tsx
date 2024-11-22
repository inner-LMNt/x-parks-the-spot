import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SettingsPage from "./SettingsPage" // Adjust path if necessary
import { Provider } from "react-redux"
import configureStore from "redux-mock-store"
import { store } from "@/store"
import { login, logout } from "@/features/user/userSlice"
import { AuthResponse } from "@/types/type"
import ProfilePage from "@/app/profile/ProfilePage"
import { injectStore } from "@/api/axiosInstance"
import { ToastProvider } from "@/components/ui/toast"

const mockStore = configureStore([])

describe("SettingsPage", () => {
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
  const renderWithStore = async (component: React.ReactNode) => {
    injectStore(store)
    return render(
      <Provider store={store}>
        <ToastProvider>{component}</ToastProvider>
      </Provider>,
    )
  }

  it("renders settings page with notification options", async () => {
    renderWithStore(<SettingsPage />)
    await waitFor(
      () => {
        expect(store.getState().user.loading).toBe(false)
      },
      { timeout: 5000 },
    )

    // Check if the Settings heading and notification options are rendered
    expect(
      screen.getByRole("heading", { level: 2, name: /settings/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/push notifications/i)).toBeInTheDocument()
  })

  it('opens the delete account dialog when clicking "Delete My Account"', async () => {
    renderWithStore(<SettingsPage />)
    await waitFor(
      () => {
        expect(store.getState().user.loading).toBe(false)
      },
      { timeout: 5000 },
    )

    // Check if the delete account button is rendered
    const deleteButton = screen.getByRole("button", {
      name: /delete my account/i,
    })
    expect(deleteButton).toBeInTheDocument()

    // Simulate clicking the delete button
    fireEvent.click(deleteButton)

    // Check if the confirmation dialog appears
    expect(screen.getByText(/confirm account deletion/i)).toBeInTheDocument()
    expect(
      screen.getByText(/please confirm your password/i),
    ).toBeInTheDocument()
  })

  it("validates password and confirm password fields correctly", async () => {
    renderWithStore(<SettingsPage />)
    await waitFor(
      () => {
        expect(store.getState().user.loading).toBe(false)
      },
      { timeout: 5000 },
    )

    // Simulate clicking the delete button
    fireEvent.click(screen.getByRole("button", { name: /delete my account/i }))

    // Simulate clicking submit without entering any password
    fireEvent.click(
      screen.getByRole("button", { name: /yes, delete my account/i }),
    )

    // Ensure validation errors appear
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      expect(
        screen.queryAllByText(/confirm your password/i)[0],
      ).toBeInTheDocument()
    })

    // Simulate typing mismatched passwords
    fireEvent.change(screen.queryAllByLabelText(/password/i)[0], {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password124" },
    })

    // Simulate clicking submit and ensure mismatch error appears
    fireEvent.click(
      screen.getByRole("button", { name: /yes, delete my account/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByText(/your passwords do not match/i),
      ).toBeInTheDocument()
    })
  })
})
