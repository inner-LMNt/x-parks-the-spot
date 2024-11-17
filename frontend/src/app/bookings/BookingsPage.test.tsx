// BookingsPage.test.tsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BookingsPage from "./BookingsPage"; // Adjust the import path based on your file structure
import { Provider } from "react-redux";
import configureStore, { MockStoreEnhanced } from "redux-mock-store";
import thunk from "redux-thunk";
import {
  fetchUserReservations,
  cancelReservation,
} from "@/features/reservations/reservationsSlice";
import { toast } from "@/hooks/use-toast";

// Initialize mock store without middlewares as per your setup
const mockStore = configureStore([]);

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
  }),
}));

// Mock actions from reservationsSlice
jest.mock("@/features/reservations/reservationsSlice", () => ({
  fetchUserReservations: jest.fn(),
  cancelReservation: jest.fn(),
}));

// Mock the toast hook
jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

describe.skip("BookingsPage Component", () => {
  let store: MockStoreEnhanced<unknown, {}>;

  beforeEach(() => {
    store = mockStore({
      user: {
        isLoggedIn: true,
        access_token: "token",
        location: {
          latitude: null,
          longitude: null,
        },
        loading: false,
        error: null,
      },
      search: {
        loading: false,
        error: null,
        spots: [],
      },
      reservations: {
        loading: false,
        error: null,
        reservations: [
          {
            id: "1",
            parking_space_id: "1692f1d6-a67b-4659-a555-bdf22359bd24",
            renter_id: "user1",
            owner_id: "owner1",
            start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
            status: "booked",
            car_info: {
              id: "car1",
              make: "Toyota",
              model: "Camry",
              year: 2020,
              color: "Blue",
              license_plate: "ABC123",
            },
            created_at: "2024-10-01T12:00:00Z",
            updated_at: "2024-10-01T12:00:00Z",
          },
          {
            id: "2",
            parking_space_id: "space2",
            renter_id: "user1",
            owner_id: "owner2",
            start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
            end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
            status: "booked",
            car_info: {
              id: "car2",
              make: "Honda",
              model: "Civic",
              year: 2018,
              color: "Red",
              license_plate: "XYZ789",
            },
            created_at: "2024-10-02T12:00:00Z",
            updated_at: "2024-10-02T12:00:00Z",
          },
          {
            id: "3",
            parking_space_id: "space3",
            renter_id: "user1",
            owner_id: "owner3",
            start_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
            end_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            status: "booked",
            car_info: {
              id: "car3",
              make: "Ford",
              model: "Focus",
              year: 2019,
              color: "Black",
              license_plate: "DEF456",
            },
            created_at: "2024-10-03T12:00:00Z",
            updated_at: "2024-10-03T12:00:00Z",
          },
        ],
        carInfos: [],
      },
      parkingSpace: {
        loading: false,
        error: null,
        parkingSpace: null,
      },
    });

    // Mock the implementation of actions
    (fetchUserReservations as jest.Mock).mockReturnValue({
      type: "reservations/fetchUserReservations",
    });
    (cancelReservation as jest.Mock).mockReturnValue({
      type: "reservations/cancelReservation",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the BookingsPage component with loading state", () => {
    store = mockStore({
      user: {
        isLoggedIn: true,
        access_token: "token",
        location: { latitude: null, longitude: null },
        loading: false,
        error: null,
      },
      search: {
        loading: false,
        error: null,
        spots: [],
      },
      reservations: {
        loading: true,
        error: null,
        reservations: [],
        carInfos: [],
      },
      parkingSpace: {
        loading: false,
        error: null,
        parkingSpace: null,
      },
    });

    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    expect(
      screen.getByText(/Loading your reservations.../i),
    ).toBeInTheDocument();
  });

  it("renders the BookingsPage component with reservations", () => {
    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    // Verify section headers
    expect(screen.getByText("Current Reservations")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Reservations")).toBeInTheDocument();
    expect(screen.getByText("Past Reservations")).toBeInTheDocument();

    // Verify reservation cards
    // Since multiple 'booked' texts exist, we'll target them by their context

    // Current Reservation
    const currentReservation = screen.getByText(
      "1692f1d6-a67b-4659-a555-bdf22359bd24",
    );
    expect(currentReservation).toBeInTheDocument();
    expect(screen.getAllByText(/booked/i)).toHaveLength(3); // Assuming all reservations have 'booked'

    // Upcoming Reservation
    const upcomingReservation = screen.getByText("space2");
    expect(upcomingReservation).toBeInTheDocument();

    // Past Reservation
    const pastReservation = screen.getByText("space3");
    expect(pastReservation).toBeInTheDocument();
  });

  it("renders the BookingsPage component with no reservations", () => {
    store = mockStore({
      user: {
        isLoggedIn: true,
        access_token: "token",
        location: { latitude: null, longitude: null },
        loading: false,
        error: null,
      },
      search: {
        loading: false,
        error: null,
        spots: [],
      },
      reservations: {
        loading: false,
        error: null,
        reservations: [],
        carInfos: [],
      },
      parkingSpace: {
        loading: false,
        error: null,
        parkingSpace: null,
      },
    });

    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    expect(screen.getByText(/You have no reservations./i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Make a Reservation/i }),
    ).toBeInTheDocument();
  });

  it("handles reservation click and navigates to reservation detail", async () => {
    const { push } = require("next/navigation").useRouter();

    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    // Click on the first reservation card
    const reservationCard = screen.getByText(
      "1692f1d6-a67b-4659-a555-bdf22359bd24",
    );
    fireEvent.click(reservationCard);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        "/bookings/1692f1d6-a67b-4659-a555-bdf22359bd24",
      );
    });
  });

  it("displays error message when fetching reservations fails", () => {
    store = mockStore({
      user: {
        isLoggedIn: true,
        access_token: "token",
        location: { latitude: null, longitude: null },
        loading: false,
        error: null,
      },
      search: {
        loading: false,
        error: null,
        spots: [],
      },
      reservations: {
        loading: false,
        error: "Failed to fetch reservations.",
        reservations: [],
        carInfos: [],
      },
      parkingSpace: {
        loading: false,
        error: null,
        parkingSpace: null,
      },
    });

    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    expect(
      screen.getByText(/Failed to fetch reservations at this time./i),
    ).toBeInTheDocument();
  });

  it("handles global loading indicator correctly", () => {
    store = mockStore({
      user: {
        isLoggedIn: true,
        access_token: "token",
        location: { latitude: null, longitude: null },
        loading: false,
        error: null,
      },
      search: {
        loading: false,
        error: null,
        spots: [],
      },
      reservations: {
        loading: true,
        error: null,
        reservations: [],
        carInfos: [],
      },
      parkingSpace: {
        loading: false,
        error: null,
        parkingSpace: null,
      },
    });

    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    expect(
      screen.getByText(/Loading your reservations.../i),
    ).toBeInTheDocument();
  });

  // Test the reservation cancellation flow
  it("handles successful reservation cancellation", async () => {
    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    // Click on the cancel button of the first reservation card
    const cancelButton = screen.getAllByText("Cancel")[0];
    fireEvent.click(cancelButton);

    // Confirm the cancellation in the modal
    const confirmButton = screen.getByText("Cancel Reservation");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(cancelReservation).toHaveBeenCalledWith("1");
      expect(toast).toHaveBeenCalledWith({
        title: "Reservation Cancelled",
        description: "Your reservation has been canceled successfully.",
        variant: "success",
      });
    });
  });

  it("handles cancellation attempt within 2 hours of the reservation start time", async () => {
    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    // Click on the cancel button of the first reservation card
    const cancelButton = screen.getAllByText("Cancel")[0];
    fireEvent.click(cancelButton);

    // Confirm the cancellation in the modal
    const confirmButton = screen.getByText("Cancel Reservation");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(cancelReservation).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith({
        title: "Failed to Cancel Reservation",
        description:
          "Reservations can only be canceled at least 2 hours before the start time.",
        variant: "destructive",
      });
    });
  });

  it("handles cancellation attempt by a user who does not own the reservation", async () => {
    store = mockStore({
      user: {
        isLoggedIn: true,
        access_token: "token",
        location: { latitude: null, longitude: null },
        loading: false,
        error: null,
      },
      search: {
        loading: false,
        error: null,
        spots: [],
      },
      reservations: {
        loading: false,
        error: null,
        reservations: [
          {
            id: "1",
            parking_space_id: "space1",
            renter_id: "user2", // Different user
            owner_id: "owner1",
            start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
            status: "booked",
            car_info: {
              id: "car1",
              make: "Toyota",
              model: "Camry",
              year: 2020,
              color: "Blue",
              license_plate: "ABC123",
            },
            created_at: "2024-10-01T12:00:00Z",
            updated_at: "2024-10-01T12:00:00Z",
          },
        ],
        carInfos: [],
      },
      parkingSpace: {
        loading: false,
        error: null,
        parkingSpace: null,
      },
    });

    render(
      <Provider store={store}>
        <BookingsPage />
      </Provider>,
    );

    // Click on the cancel button of the first reservation card
    const cancelButton = screen.getAllByText("Cancel")[0];
    fireEvent.click(cancelButton);

    // Confirm the cancellation in the modal
    const confirmButton = screen.getByText("Cancel Reservation");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(cancelReservation).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith({
        title: "Failed to Cancel Reservation",
        description: "User not authorized to cancel this reservation.",
        variant: "destructive",
      });
    });
  });
});
