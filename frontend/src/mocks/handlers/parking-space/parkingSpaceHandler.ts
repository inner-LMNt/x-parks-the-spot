// src/mocks/handlers/parkingSpace/parkingSpaceHandler.ts

import { http, HttpResponse } from 'msw';
import { ParkingSpace } from '@/types/type';
import { spaces } from '@/mocks/data/parking/parkingData';

/**
 * **Simulated Authentication Context**
 * Replace 'user1' with dynamic user IDs as needed.
 * In a real scenario, extract from request headers or tokens.
 */
const authenticatedUserId = 'user1';

/**
* Handler for GET /parking-spaces/:id
* Fetch Parking Space Details
*/
export const getParkingSpaceHandler = http.get<
    never,
    { id: string },
    ParkingSpace | { message: string }
>(
    '/v1/parking-spaces/:id',
    async ({ params }) => {
        const { id } = params;
        console.log(`MSW: Handling GET /v1/parking-spaces/${id}`); // Logging

        const parkingSpace = spaces.find((space) => space.id === id);

        if (parkingSpace) {
            console.log(`MSW: Found parking space with ID ${id}`);
            return HttpResponse.json(parkingSpace, { status: 200 });
        } else {
            console.log(`MSW: Parking space with ID ${id} not found`);
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
    '/v1/reservations/lock',
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
    '/v1/reservations/unlock',
    async ({ request }) => {
        const body = await request.json(); // Parse as JSON object
        const parking_space_id = body.parking_space_id;


        const parkingSpace = spaces.find((space) => space.id === parking_space_id);

        if (!parkingSpace) {
            return HttpResponse.json(
                { message: 'Parking space not found' },
                { status: 404 }
            );
        }

        if (
            !parkingSpace.locked
        ) {
            return HttpResponse.json(
                { message: 'Parking space already unlocked' },
                { status: 409 }
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
 * **Export Parking Space Handlers**
 */
export const parkingSpaceHandlers = [
    getParkingSpaceHandler,
    lockParkingSpaceHandler,
    unlockParkingSpaceHandler,
];
