// src/mocks/handlers/reservations/reservationsHandler.ts

import { http, HttpResponse } from 'msw';
import {
    Reservation,
    ReservationCreateRequest,
    CarInfo,
    ParkingSpace,
} from '@/types/type';
import { reservations } from '@/mocks/data/reservations/reservationsData';
import { spaces } from '@/mocks/data/parking/parkingData';
import { carInfos } from '@/mocks/data/cars/carInfoData';

/**
 * Handler for GET /v1/reservations
 */
export const getUserReservationsHandler = http.get<never, never, Reservation[]>(
    '/v1/reservations',
    async ({ request }) => {
        // Simulate authenticated user
        const userId = 'user1'; // Replace with actual user ID from auth context

        const url = new URL(request.url);
        const parkingSpaceId = url.searchParams.get('parking_space_id');

        let userReservations = reservations.filter(
            (reservation) => reservation.renter_id === userId
        );

        if (parkingSpaceId) {
            userReservations = userReservations.filter(
                (reservation) => reservation.parking_space_id === parkingSpaceId
            );
        }

        return HttpResponse.json(userReservations, { status: 200 });
    }
);

/**
 * Handler for POST /v1/reservations
 */
export const createReservationHandler = http.post<
    ReservationCreateRequest,
    never,
    Reservation | { message: string }
>(
    '/v1/reservations/spaces',
    async ({ body }) => {
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
            return HttpResponse.json(
                { message: 'Invalid input' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find(
            (space) => space.id === parking_space_id
        );
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

        // Check for overlapping reservations
        const overlappingReservation = reservations.find(
            (reservation) =>
                reservation.parking_space_id === parking_space_id &&
                reservation.start_time < end_time &&
                reservation.end_time > start_time
        );

        if (overlappingReservation) {
            return HttpResponse.json(
                { message: 'Time slot is already booked' },
                { status: 409 }
            );
        }

        // Create new reservation
        const newReservation: Reservation = {
            id: `${reservations.length + 1}`,
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

        // Unlock the parking space (if implementing locking in the future)
        parkingSpace.isLocked = false;
        parkingSpace.lockExpiresAt = null;

        return HttpResponse.json(newReservation, { status: 201 });
    }
);

/**
 * Handler for GET /v1/cars
 */
export const getUserCarInfosHandler = http.get<never, never, CarInfo[]>(
    '/v1/cars',
    async () => {
        // Simulate authenticated user
        const userId = 'user1'; // Replace with actual user ID from auth context

        // Return car infos belonging to the user
        const userCarInfos = carInfos;

        return HttpResponse.json(userCarInfos, { status: 200 });
    }
);

/**
 * Handler for GET /v1/parking-space
 */
export const getParkingSpaceHandler = http.get<
    never,
    never,
    ParkingSpace | { message: string }
>(
    '/v1/parking-space',
    async ({ request }) => {
        const url = new URL(request.url);
        const parkingSpaceId = url.searchParams.get('parking_space_id');

        if (!parkingSpaceId) {
            return HttpResponse.json(
                { message: 'parking_space_id is required' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find(
            (space) => space.id === parkingSpaceId
        );

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
 * Handler for POST /v1/parking-space/lock
 */
export const lockParkingSpaceHandler = http.post<
    never,
    never,
    { expiresAt: number } | { message: string }
>(
    '/v1/parking-space/lock',
    async ({ request }) => {
        const url = new URL(request.url);
        const parkingSpaceId = url.searchParams.get('parking_space_id');

        if (!parkingSpaceId) {
            return HttpResponse.json(
                { message: 'parking_space_id is required' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find(
            (space) => space.id === parkingSpaceId
        );

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }

        if (
            parkingSpace.isLocked &&
            parkingSpace.lockExpiresAt &&
            parkingSpace.lockExpiresAt > Date.now()
        ) {
            return HttpResponse.json(
                { message: 'Parking space is already locked' },
                { status: 409 }
            );
        }

        // Lock the parking space for 5 minutes
        const lockDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        parkingSpace.isLocked = true;
        parkingSpace.lockExpiresAt = Date.now() + lockDuration;

        return HttpResponse.json(
            { expiresAt: parkingSpace.lockExpiresAt },
            { status: 200 }
        );
    }
);

/**
 * Handler for POST /v1/parking-space/unlock
 */
export const unlockParkingSpaceHandler = http.post<
    never,
    never,
    void | { message: string }
>(
    '/v1/parking-space/unlock',
    async ({ request }) => {
        const url = new URL(request.url);
        const parkingSpaceId = url.searchParams.get('parking_space_id');

        if (!parkingSpaceId) {
            return HttpResponse.json(
                { message: 'parking_space_id is required' },
                { status: 400 }
            );
        }

        const parkingSpace = spaces.find(
            (space) => space.id === parkingSpaceId
        );

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }

        parkingSpace.isLocked = false;
        parkingSpace.lockExpiresAt = null;

        return HttpResponse.json({}, { status: 200 });
    }
);