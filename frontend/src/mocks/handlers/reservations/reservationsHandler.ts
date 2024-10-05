// src/mocks/handlers/reservations/reservationsHandler.ts

import { http, HttpResponse } from 'msw';
import {
    Reservation,
    ReservationCreateRequest,
    ReservationUpdateRequest,
    CarInfo,
    ParkingSpace,
} from '@/types/type';
import { reservations } from '@/mocks/data/reservations/reservationsData';
import { spaces } from '@/mocks/data/parking/parkingData';
import { carInfos } from '@/mocks/data/cars/carInfoData';

/**
 * **Simulated Authentication Context**
 * Replace 'user1' with dynamic user IDs as needed.
 * In a real scenario, extract from request headers or tokens.
 */
const authenticatedUserId = 'user1';

/**
 * Handler for GET /reservations
 * Fetch Current User's Reservations
 */
export const getUserReservationsHandler = http.get<never, never, Reservation[]>(
    '/reservations',
    async ({ request }) => {

        let userReservations = reservations.filter(a => a.renter_id != null);

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
>(
    '/reservations/:id',
    async ({ params }) => {
        const { id } = params;
        const reservation = reservations.find((r) => r.id === id);

        if (reservation) {
            return HttpResponse.json(reservation, { status: 200 });
        } else {
            return HttpResponse.json(
                { message: 'Reservation not found' },
                { status: 404 }
            );
        }
    }
);

/**
 * Handler for POST /reservations
 * Create a New Reservation
 */
export const createReservationHandler = http.post<
    never,
    never,
    Reservation | { message: string }
>(
    '/reservations',
    async ({ request }) => {
        // Parse the request body
        const body: ReservationCreateRequest = await request.json();

        const { parking_space_id, start_time, end_time, car_info_id, renter_id } = body;

        // Validate required fields
        if (!parking_space_id || !start_time || !end_time || !car_info_id || !renter_id) {
            return HttpResponse.json(
                { message: 'Invalid input' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find((space) => space.id === parking_space_id);
        const carInfo = carInfos.find((car) => car.id === car_info_id);

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }

        if (!carInfo) {
            return HttpResponse.json(
                { message: 'Car information not found' },
                { status: 404 }
            );
        }

        // Check if the parking space is locked by the user
        if (parkingSpace.locked && parkingSpace.locked_by !== renter_id) {
            return HttpResponse.json(
                { message: 'Parking space is locked by another user' },
                { status: 403 }
            );
        }

        // Check for overlapping reservations
        const overlappingReservation = reservations.find(
            (reservation) =>
                reservation.parking_space_id === parking_space_id &&
                reservation.start_time < end_time &&
                reservation.end_time > start_time
        );

        if (overlappingReservation) {
            return HttpResponse.json(
                { message: 'Parking space is already reserved for the selected time slot' },
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
            status: 'booked',
            car_info: carInfo,
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
    }
);

/**
 * Handler for PUT /reservations/:id
 * Update an Existing Reservation
 */
export const updateReservationHandler = http.put<
    never,
    { id: string },
    Reservation | { message: string }
>(
    '/reservations/:id',
    async ({ request, params }) => {
        const { id } = params;
        // Parse the request body
        const body: { id: string } = await request.json();

        const { start_time, end_time, status } = body;

        const reservationIndex = reservations.findIndex((r) => r.id === id);

        if (reservationIndex === -1) {
            return HttpResponse.json(
                { message: 'Reservation not found' },
                { status: 404 }
            );
        }

        // Validate input
        if (!start_time && !end_time && !status) {
            return HttpResponse.json(
                { message: 'Invalid input' },
                { status: 400 }
            );
        }

        const existingReservation = reservations[reservationIndex];
        const parkingSpace = spaces.find((space) => space.id === existingReservation.parking_space_id);

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Associated parking space not found' },
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
                    reservation.start_time < newEndTime &&
                    reservation.end_time > newStartTime
            );

            if (overlappingReservation) {
                return HttpResponse.json(
                    { message: 'Parking space is already reserved for the selected time slot' },
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
    }
);

/**
 * Handler for GET /parking-spaces/:id
 * Fetch Parking Space Details
 */
export const getParkingSpaceHandler = http.get<
    never,
    { id: string },
    ParkingSpace | { message: string }
>(
    '/parking-spaces/:id',
    async ({ params }) => {
        const { id } = params;
        const parkingSpace = spaces.find((space) => space.id === id);

        if (parkingSpace) {
            return HttpResponse.json(parkingSpace, { status: 200 });
        } else {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }
    }
);

/**
 * Handler for POST /reservations/lock
 * Lock a Parking Space
 */
export const lockParkingSpaceHandler = http.post<
    never,
    never,
    { expiresAt: number } | { message: string }
>(
    '/reservations/lock',
    async ({ request }) => {
        const body = await request.json();
        const { parking_space_id, lock_duration } = body;

        if (!parking_space_id || !lock_duration) {
            return HttpResponse.json(
                { message: 'Invalid input data' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find((space) => space.id === parking_space_id);

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }

        if (
            parkingSpace.locked &&
            parkingSpace.locked_until &&
            new Date(parkingSpace.locked_until).getTime() > Date.now()
        ) {
            return HttpResponse.json(
                { message: 'Parking space is already locked or reserved' },
                { status: 409 }
            );
        }

        // Parse lock_duration (e.g., "PT15M" for 15 minutes)
        const durationMatch = lock_duration.match(/PT(\d+)M/);
        const lockDurationMinutes = durationMatch ? parseInt(durationMatch[1], 10) : 15;
        const lockDurationMs = lockDurationMinutes * 60 * 1000;

        const expiresAtDate = new Date(Date.now() + lockDurationMs);
        const expiresAt = expiresAtDate.toISOString();

        // Lock the parking space
        parkingSpace.locked = true;
        parkingSpace.locked_by = authenticatedUserId; // Replace with actual user ID from auth context
        parkingSpace.locked_until = expiresAt;

        return HttpResponse.json(
            { expiresAt: expiresAtDate.getTime() },
            { status: 200 }
        );
    }
);

/**
 * Handler for POST /reservations/unlock
 * Unlock a Parking Space
 */
export const unlockParkingSpaceHandler = http.post(
    '/reservations/unlock',
    async ({ request }) => {
        const body: string = await request.text();
        const parking_space_id = JSON.parse(body);

        if (!parking_space_id || typeof parking_space_id !== 'string') {
            return HttpResponse.json(
                { message: 'Invalid input data' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find((space) => space.id === parking_space_id);

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }

        if (
            !parkingSpace.locked ||
            !parkingSpace.locked_until ||
            new Date(parkingSpace.locked_until).getTime() <= Date.now()
        ) {
            return HttpResponse.json(
                { message: 'Parking space is not currently locked by the user' },
                { status: 404 }
            );
        }

        // Ensure that only the user who locked can unlock
        if (parkingSpace.locked_by !== authenticatedUserId) {
            return HttpResponse.json(
                { message: 'You do not have permission to unlock this parking space' },
                { status: 403 }
            );
        }

        // Unlock the parking space
        parkingSpace.locked = false;
        parkingSpace.locked_by = undefined;
        parkingSpace.locked_until = undefined;

        return HttpResponse.json({}, { status: 200 });
    }
);

/**
 * Handler for GET /cars
 * Fetch User's Car Information
 */
export const getUserCarInfosHandler = http.get<never, never, CarInfo[]>(
    '/cars',
    async () => {
        // Assuming all carInfos belong to the authenticated user
        return HttpResponse.json(carInfos, { status: 200 });
    }
);

/**
 * **Export All Handlers**
 */
export const reservationsHandlers = [
    getUserReservationsHandler,
    getReservationByIdHandler,
    createReservationHandler,
    updateReservationHandler,
    getParkingSpaceHandler,
    lockParkingSpaceHandler,
    unlockParkingSpaceHandler,
    getUserCarInfosHandler,
];
