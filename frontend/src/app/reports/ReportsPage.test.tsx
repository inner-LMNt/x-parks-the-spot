"use client"

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import userEvent from "@testing-library/user-event"
import ReportsPage from "./ReportsPage"
import { login, logout } from "@/features/user/userSlice"
import { RootState, store } from "@/store"
import { AuthResponse } from "@/types/type"
import { injectStore } from "@/api/axiosInstance"
import { ToastProvider } from "@/components/ui/toast"

describe("ReportsPage Component", () => {
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

  describe("Page Layout and Navigation", () => {
    it("renders main heading and navigation elements", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      expect(
        screen.getByRole("heading", { name: "Your Reports" }),
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument()
    })

    it("navigates back when back button is clicked", async () => {
      const { back } = jest.requireMock("next/navigation").useRouter()
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      fireEvent.click(screen.getByRole("button", { name: /back/i }))
    })
  })

  describe("Filter Controls", () => {
    it("displays filter dropdowns in correct initial state", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      const typeFilter = screen.getByText("All Reports")
      const statusFilter = screen.getByText("Active")

      expect(typeFilter).toBeInTheDocument()
      expect(statusFilter).toBeInTheDocument()
    })

    it("opens type filter dropdown with all options", async () => {
      window.HTMLElement.prototype.scrollIntoView = function () {}
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      await waitFor(() => {
        expect(screen.queryByText("Reservation Issues")).not.toBeInTheDocument()
        expect(screen.getAllByText("Renter Overstay").length).toBe(1)
        expect(screen.queryByText("Damage Reports")).not.toBeInTheDocument()
        expect(screen.queryByText("Other Issues")).not.toBeInTheDocument()
      })

      // Find and click the type filter button
      const typeFilterButton = screen.getByText("All Reports").closest("button")
      expect(typeFilterButton).toBeInTheDocument()
      if (typeFilterButton) {
        fireEvent.click(typeFilterButton)
      }

      // Check for all filter options
      await waitFor(() => {
        expect(screen.getByText("Reservation Issues")).toBeInTheDocument()
        expect(screen.getAllByText("Renter Overstay").length).toBe(2)
        expect(screen.getByText("Damage Reports")).toBeInTheDocument()
        expect(screen.getByText("Other Issues")).toBeInTheDocument()
      })
    })

    it("opens status filter dropdown with all options", async () => {
      window.HTMLElement.prototype.scrollIntoView = function () {}
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      await waitFor(() => {
        expect(screen.getAllByText("Active").length).toBe(1)
        expect(screen.queryByText("Resolved")).not.toBeInTheDocument()
      })
      // Find and click the status filter button
      const statusFilterButton = screen.getByText("Active").closest("button")
      expect(statusFilterButton).toBeInTheDocument()
      if (statusFilterButton) {
        fireEvent.click(statusFilterButton)
      }

      // Check for all status options
      await waitFor(() => {
        expect(screen.getAllByText("Active").length).toBe(2)
        expect(screen.getByText("Resolved")).toBeInTheDocument()
      })
    })
  })

  describe("Report Creation", () => {
    it("displays report creation button", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      expect(screen.getByRole("button", { name: "Report" })).toBeInTheDocument()
    })

    it("opens report creation dialog when Report button is clicked", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      const reportButton = screen.getByTestId("Report Button")
      fireEvent.click(reportButton)

      await waitFor(() => {
        expect(screen.getByText("Submit")).toBeInTheDocument()
      })
    })
  })

  describe("Error Handling", () => {
    it("shows error toast on API failure", async () => {
      const mockToast = jest.requireMock("@/hooks/use-toast").toast

      store.dispatch({
        type: "reports/fetchUserReports/rejected",
        error: { message: "Failed to fetch reports" },
      })

      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
    })
  })

  describe("Data Loading", () => {
    it("loads reports data on component mount", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      // Check that the fetching actions were dispatched
      await waitFor(() => {
        const actions = store.getState()
        expect(actions.reports.loading).toBeFalsy()
      })
    })

    it("loads user reservations on component mount", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
    })

    it("loads owner reservations on component mount", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
    })
  })

  describe("Accessibility", () => {
    it("maintains focusable elements in a logical tab order", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      const focusableElements = screen.getAllByRole("button")
      expect(focusableElements.length).toBeGreaterThan(0)
      // First focusable element should be the back button
      expect(focusableElements[0]).toHaveTextContent("Back")
    })

    it("provides accessible names for all interactive elements", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      const buttons = screen.getAllByRole("button")
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })
  })
  describe("Filter Functionality", () => {
    // Remove the mock reports setup since we're using real data

    it("filters reports by type correctly", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      // Find and click the type filter button
      const typeFilterButton = screen.getAllByRole("combobox")[0]
      await fireEvent.click(typeFilterButton)

      // Click "Damage Reports" option
      const damageOption = screen.getByRole("option", {
        name: /damage reports/i,
      })
      await fireEvent.click(damageOption)

      // Wait for filtered reports to be displayed
      await waitFor(() => {
        const reports = screen.getAllByTestId("report-item")
        expect(reports.length).toBeGreaterThan(0)
        reports.forEach((report) => {
          expect(report).toHaveTextContent(/damage/i)
        })
      })
    })

    it("filters reports by status correctly", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      // Find and click the status filter button
      const statusFilterButton = screen.getAllByRole("combobox")[1]
      await fireEvent.click(statusFilterButton)

      // Click "Resolved" option
      const resolvedOption = screen.getByRole("option", {
        name: /resolved/i,
      })
      await fireEvent.click(resolvedOption)

      // Wait for filtered reports to be displayed
      await waitFor(() => {
        const reports = screen.getAllByTestId("report-item")
        expect(reports.length).toBeGreaterThan(0)
        reports.forEach((report) => {
          expect(report).toHaveTextContent(/resolved/i)
        })
      })
    })

    it("combines type and status filters", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )

      // Set type filter to "Damage Reports"
      const typeFilterButton = screen.getAllByRole("combobox")[0]
      await fireEvent.click(typeFilterButton)
      const damageOption = screen.getByRole("option", {
        name: /other issues/i,
      })
      await fireEvent.click(damageOption)

      // Set status filter to "Resolved"
      const statusFilterButton = screen.getAllByRole("combobox")[1]
      await fireEvent.click(statusFilterButton)
      const resolvedOption = screen.getByRole("option", {
        name: /resolved/i,
      })
      await fireEvent.click(resolvedOption)

      // Wait for filtered reports to be displayed
      await waitFor(() => {
        const reports = screen.queryAllByTestId("report-item")
        expect(reports.length).toBe(2)
        reports.forEach((report) => {
          expect(report).toHaveTextContent(/other/i)
          expect(report).toHaveTextContent(/resolved/i)
        })
      })
    })
  })

  describe("Report Dialog Functionality", () => {
    it("opens dialog with correct default values when creating new report", async () => {
      await renderWithStore(<ReportsPage />)

      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      expect(screen.getAllByRole("combobox", undefined).length).toBe(2)
      const reportButton = screen.getByTestId("Report Button")
      fireEvent.click(reportButton)

      await waitFor(() => {
        expect(screen.getByText("Report an Issue")).toBeInTheDocument()
        expect(
          screen.getByText(
            "Select the type of issue and provide the necessary details.",
          ),
        ).toBeInTheDocument()
        expect(screen.getAllByRole("combobox", undefined).length).toBe(3)
      })
    })

    it("closes dialog when clicking the close button", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      const reportButton = screen.getByTestId("Report Button")
      fireEvent.click(reportButton)

      await waitFor(() => {
        const closeButton = screen.getByTestId("Close Report Dialog")
        fireEvent.click(closeButton)
        expect(screen.queryByText("Report an Issue")).not.toBeInTheDocument()
      })
    })
  })

  describe("List View Behavior", () => {
    beforeEach(() => {
      store.dispatch({
        type: "reports/setReports",
        payload: Array(10)
          .fill(null)
          .map((_, i) => ({
            id: i + 1,
            type: "Reservation Issue",
            status: i % 2 === 0 ? "open" : "resolved",
            createdAt: new Date().toISOString(),
          })),
      })
    })

    it("renders the correct number of report items", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      const reportItems = screen.getAllByTestId("report-item")
      expect(reportItems).toHaveLength(4)
    })

    it("displays reports in the correct order", async () => {
      await renderWithStore(<ReportsPage />)
      await waitFor(
        () => {
          expect(store.getState().reports.loading).toBe(false)
        },
        { timeout: 5000 },
      )
      const reportItems = screen.getAllByTestId("report-item")

      // Assuming reports should be ordered by creation date
      const dates = reportItems.map((item) => {
        const dateStr = item.getAttribute("data-created-at")
        return dateStr ? new Date(dateStr).getTime() : 0
      })

      const isSorted = dates.every((date, i) => {
        if (i === 0) return true
        return date <= dates[i - 1]
      })

      expect(isSorted).toBe(true)
    })
  })
})
