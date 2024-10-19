// src/mocks/handlers/reservations/reservationsHandler.ts

import { http, HttpResponse } from "msw";
import {
  Reservation,
  ReservationCreateRequest,
  ReservationUpdateRequest,
  CarInfo,
} from "@/types/type";
import { reservations } from "@/mocks/data/reservations/reservationsData";
import { carInfos } from "@/mocks/data/cars/carInfoData";

/**
 * **Simulated Authentication Context**
 * Replace 'user1' with dynamic user IDs as needed.
 * In a real scenario, extract from request headers or tokens.
 */
const authenticatedUserId = "user1";

/**
 * Handler for GET /reservations
 * Fetch Current User's Reservations
 */
export const getUserReservationsHandler = http.get<never, never, Reservation[]>(
  "/v1/reservations",
  async ({ request }) => {
    let userReservations = reservations.filter(
      (a) => a.renter_id === authenticatedUserId
    );

    return HttpResponse.json(userReservations, { status: 200 });
  }
);

/**
 * Handler for GET /reservations/:id
 * Fetch Reservation Details by ID
 */
export const getReservationByIdHandler = http.get<
  never,
  { id: string },
  Reservation | { message: string }
>("/v1/reservations/:id", async ({ params }) => {
  const { id } = params;
  const reservation = reservations.find((r) => r.id === id);

  if (reservation) {
    return HttpResponse.json(reservation, { status: 200 });
  } else {
    return HttpResponse.json(
      { message: "Reservation not found" },
      { status: 404 }
    );
  }
});

/**
 * Handler for POST /reservations
 * Create a New Reservation
 */
export const createReservationHandler = http.post<
  never,
  never,
  Reservation | { message: string }
>("/v1/reservations", async ({ request }) => {
  // Parse the request body
  const body: ReservationCreateRequest = await request.json();

  const { parking_space_id, start_time, end_time, car_info_id, renter_id } =
    body;

  // Validate required fields
  if (
    !parking_space_id ||
    !start_time ||
    !end_time ||
    !car_info_id ||
    !renter_id
  ) {
    return HttpResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  // Assuming you have a way to fetch parkingSpace and carInfo
  // For example, importing from mock data or another handler

  // Placeholder: Replace with actual logic to fetch parkingSpace and carInfo
  // const parkingSpace = spaces.find((space) => space.id === parking_space_id);
  // const carInfo = carInfos.find((car) => car.id === car_info_id);

  // Mock logic for demonstration
  const parkingSpace = {
    id: parking_space_id,
    owner_id: "owner1",
    locked: false,
  } as any;

  if (!parkingSpace) {
    return HttpResponse.json(
      { message: "Parking space not found" },
      { status: 404 }
    );
  }


  // Check if the parking space is locked by the user
  if (parkingSpace.locked && parkingSpace.locked_by !== renter_id) {
    return HttpResponse.json(
      { message: "Parking space is locked by another user" },
      { status: 403 }
    );
  }

  // Check for overlapping reservations
  const overlappingReservation = reservations.find(
    (reservation) =>
      reservation.parking_space_id === parking_space_id &&
      (reservation.start_time ?? end_time) < end_time &&
      (reservation.end_time ?? start_time) > start_time
  );

  if (overlappingReservation) {
    return HttpResponse.json(
      {
        message: "Parking space is already reserved for the selected time slot",
      },
      { status: 409 }
    );
  }

  // Create new reservation
  const newReservation: Reservation = {
    id: `${reservations.length + 1}`, // Ideally, use a UUID generator
    parking_space_id,
    renter_id,
    owner_id: parkingSpace.owner_id,
    start_time,
    end_time,
    status: "booked",
    car_info_id: 'car_id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  reservations.push(newReservation);

  // Optionally, unlock the parking space if reservation is made
  if (parkingSpace.locked) {
    parkingSpace.locked = false;
    parkingSpace.locked_by = undefined;
    parkingSpace.locked_until = undefined;
  }

  return HttpResponse.json(newReservation, { status: 201 });
});

/**
 * Handler for PUT /reservations/:id
 * Update an Existing Reservation
 */
export const updateReservationHandler = http.put<
  never,
  any,
  Reservation | { message: string }
>("/v1/reservations/:id", async ({ request, params }) => {
  const { id } = params;
  // Parse the request body
  const body: any = await request.json();
  const { start_time, end_time, status } = body;
  if (!start_time || !end_time || !status) {
    return HttpResponse.json({ message: "Invalid input" }, { status: 400 });
  }
  const reservationIndex = reservations.findIndex((r) => r.id === id);

  if (reservationIndex === -1) {
    return HttpResponse.json(
      { message: "Reservation not found" },
      { status: 404 }
    );
  }

  const existingReservation = reservations[reservationIndex];
  // Placeholder: Replace with actual logic to fetch parkingSpace
  const parkingSpace = { id: existingReservation.parking_space_id } as any;

  if (!parkingSpace) {
    return HttpResponse.json(
      { message: "Associated parking space not found" },
      { status: 404 }
    );
  }

  // If updating time, check for overlaps
  if (start_time || end_time) {
    const newStartTime = start_time || existingReservation.start_time;
    const newEndTime = end_time || existingReservation.end_time;

    const overlappingReservation = reservations.find(
      (reservation) =>
        reservation.parking_space_id === existingReservation.parking_space_id &&
        reservation.id !== id &&
        (reservation.start_time ?? newEndTime) < newEndTime &&
        (reservation.end_time ?? newStartTime) > newStartTime
    );

    if (overlappingReservation) {
      return HttpResponse.json(
        {
          message:
            "Parking space is already reserved for the selected time slot",
        },
        { status: 409 }
      );
    }
  }

  // Update reservation
  const updatedReservation: Reservation = {
    ...existingReservation,
    start_time: start_time || existingReservation.start_time,
    end_time: end_time || existingReservation.end_time,
    status: status || existingReservation.status,
    updated_at: new Date().toISOString(),
  };

  reservations[reservationIndex] = updatedReservation;

  return HttpResponse.json(updatedReservation, { status: 200 });
});

/**
 * Handler for GET /cars
 * Fetch User's Car Information
 */
export const getUserCarInfosHandler = http.get<never, never, CarInfo[]>(
  "/v1/cars",
  async () => {
    // Assuming all carInfos belong to the authenticated user
    return HttpResponse.json(carInfos, { status: 200 });
  }
);

/**
 * **Export Reservations Handlers**
 */
export const reservationsHandlers = [
  getUserReservationsHandler,
  getReservationByIdHandler,
  createReservationHandler,
  updateReservationHandler,
  getUserCarInfosHandler,
];
