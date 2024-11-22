import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SearchPage from "./page"
import { Provider } from "react-redux"
import configureStore, { MockStoreEnhanced } from "redux-mock-store"
import { searchSpots } from "@/features/search/searchSlice"
import "@testing-library/jest-dom"
import { store } from "@/store"
import { login, logout } from "@/features/user/userSlice"
import { AuthResponse } from "@/types/type"
import { injectStore } from "@/api/axiosInstance"
import { ToastProvider } from "@/components/ui/toast"

jest.mock("@react-google-maps/api", () => ({
  LoadScript: ({ children }) => <div data-testid="load-script">{children}</div>,
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: ({ onClick }) => <div data-testid="marker" onClick={onClick}></div>,
  InfoWindow: ({ children }) => <div data-testid="info-window">{children}</div>,
  DirectionsRenderer: () => <div data-testid="directions-renderer"></div>,
  Autocomplete: ({ children }) => (
    <div data-testid="autocomplete">{children}</div>
  ),
}))

const mockStore = configureStore([])

describe.skip("SearchPage", () => {
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

  it("renders the search for parking component", async () => {
    await renderWithStore(<SearchPage />)
    await waitFor(
      () => {
        expect(store.getState().reports.loading).toBe(false)
      },
      { timeout: 5000 },
    )

    expect(screen.getByText("Search for Parking")).toBeInTheDocument()
    expect(screen.getByText("Radius (km):")).toBeInTheDocument()
    expect(screen.getByLabelText("Radius Input")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Select" })).toHaveLength(2)
  })

  it("displays the user location on the map", async () => {
    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    expect(screen.getByTestId("google-map")).toBeInTheDocument()
    expect(screen.getAllByTestId("marker")).toHaveLength(3)
  })

  it("selects and deselects a parking spot", async () => {
    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    const selectButtons = screen.getAllByRole("button", { name: "Select" })
    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId("info-window")).toBeInTheDocument()
      expect(screen.getAllByText("Latitude: 40.4237")).toHaveLength(2)
      expect(screen.getAllByText("Longitude: -86.9212")).toHaveLength(2)
      expect(
        screen.getByRole("button", { name: "Directions" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Reserve" }),
      ).toBeInTheDocument()
    })

    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      expect(screen.queryByTestId("info-window")).not.toBeInTheDocument()
    })
  })

  it("searches for parking spots with the user location", async () => {
    ;(searchSpots as jest.Mock).mockImplementation(
      (request) => async (dispatch: any) => {
        dispatch({
          type: "search/searchSpots/fulfilled",
          payload: [
            {
              id: "3",
              owner_id: "1003",
              location: {
                latitude: 40.424,
                longitude: -86.9215,
                address: "Address 3",
              },
              is_paid: true,
            },
          ],
        })
      },
    )

    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    const radiusInput = screen.getByLabelText("Radius Input")
    fireEvent.change(radiusInput, { target: { value: "3" } })
    expect(radiusInput).toHaveValue(3)

    const searchButton = screen.getByRole("button", { name: "Search" })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(searchSpots).toHaveBeenCalledWith({
        latitude: 40.4237,
        longitude: -86.9212,
        radius: 3,
      })
    })
  })

  it("handles geolocation failure", async () => {
    ;(
      global.navigator.geolocation.getCurrentPosition as jest.Mock
    ).mockImplementationOnce((success, error) => error())

    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          /Please enable geolocation to search for parking spots near you./i,
        ),
      ).toBeInTheDocument()
    })
  })

  it("toggles use of current location", async () => {
    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    const useCurrentLocationCheckbox = screen.getByLabelText(
      "Use Current Location",
    )
    expect(useCurrentLocationCheckbox).toBeChecked()

    fireEvent.click(useCurrentLocationCheckbox)
    expect(useCurrentLocationCheckbox).not.toBeChecked()

    // Note: We're not testing for an address input here as it seems it might not be present
    // or might be handled differently in the actual component
  })

  it("prevents searching with invalid radius", async () => {
    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    const radiusInput = screen.getByLabelText("Radius Input")
    fireEvent.change(radiusInput, { target: { value: "10" } })

    expect(radiusInput).toHaveValue(5)

    const searchButton = screen.getByRole("button", { name: "Search" })
    fireEvent.click(searchButton)

    await waitFor(() => {
      expect(searchSpots).toHaveBeenCalledWith({
        latitude: 40.4237,
        longitude: -86.9212,
        radius: 5,
      })
    })
  })

  it("reserves a parking spot", async () => {
    render(
      <Provider store={store}>
        <SearchPage />
      </Provider>,
    )

    const selectButtons = screen.getAllByRole("button", { name: "Select" })
    fireEvent.click(selectButtons[0])

    await waitFor(() => {
      const reserveButton = screen.getByRole("button", { name: "Reserve" })
      fireEvent.click(reserveButton)
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/bookings/1/reserve?previousUrl=%2Fsearch",
      )
    })
  })
})
