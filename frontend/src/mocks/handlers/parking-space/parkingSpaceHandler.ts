// src/mocks/handlers/parkingSpace/parkingSpaceHandler.ts

import { http, HttpResponse } from "msw";
import { ParkingSpace } from "@/types/type";
import { spaces } from "@/mocks/data/parking/parkingData";

/**
 * **Simulated User ID**
 * Set the owner_id to '923e4567-e89b-12d3-a456-426614174008' as per your request.
 */
const authenticatedUserId = "923e4567-e89b-12d3-a456-426614174008";

/**
 * Handler for GET /v1/parking-spaces
 * Fetch Parking Spaces Owned by Authenticated User
 */
export const getOwnedParkingSpacesHandler = http.get<
    never,
    never,
    { paidSpaces: ParkingSpace[]; freeSpaces: ParkingSpace[]; pendingSpaces: ParkingSpace[] } | { message: string }
>("/v1/parking-spaces", async () => {
    console.log(`MSW: Handling GET /v1/parking-spaces`); // Logging

    // No authentication check; use the hardcoded authenticatedUserId

    // Filter spaces owned by the authenticated user
    const userSpaces = spaces.filter((space) => space.owner_id === authenticatedUserId);

    // Initialize arrays
    const paidSpaces: ParkingSpace[] = [];
    const freeSpaces: ParkingSpace[] = [];
    const pendingSpaces: ParkingSpace[] = [];

    // Classify the user's spaces
    userSpaces.forEach((space) => {
        if (space.status?.toUpperCase() === "PENDING") {
            pendingSpaces.push(space);
        } else if (space.is_paid) {
            paidSpaces.push(space);
        } else {
            freeSpaces.push(space);
        }
    });

    console.log(`MSW: Returning ${userSpaces.length} parking spaces for owner_id ${authenticatedUserId}`);

    // Return the classified spaces
    return HttpResponse.json({ paidSpaces, freeSpaces, pendingSpaces }, { status: 200 });
});

/**
 * Handler for GET /v1/parking-spaces/:id
 * Fetch Parking Space Details
 */
export const getParkingSpaceHandler = http.get<
    never,
    { id: string },
    ParkingSpace | { message: string }
>("/v1/parking-spaces/:id", async ({ params }) => {
    const { id } = params;
    console.log(`MSW: Handling GET /v1/parking-spaces/${id}`); // Logging

    const parkingSpace = spaces.find((space) => space.id === id);

    if (parkingSpace) {
        console.log(`MSW: Found parking space with ID ${id}`);
        return HttpResponse.json(parkingSpace, { status: 200 });
    } else {
        console.log(`MSW: Parking space with ID ${id} not found`);
        return HttpResponse.json(
            { message: "Parking space not found" },
            { status: 404 }
        );
    }
});

/**
 * Handler for POST /v1/reservations/lock
 * Lock a Parking Space
 */
export const lockParkingSpaceHandler = http.post<
    never,
    any,
    { expiresAt: number } | { message: string }
>("/v1/reservations/lock", async ({ request }) => {
    const body = await request.json();
    const { parking_space_id, lock_duration } = body;

    if (!parking_space_id || !lock_duration) {
        return HttpResponse.json(
            { message: "Invalid input data" },
            { status: 400 }
        );
    }

    const parkingSpace = spaces.find((space) => space.id === parking_space_id);

    if (!parkingSpace) {
        return HttpResponse.json(
            { message: "Parking space not found" },
            { status: 404 }
        );
    }

    if (parkingSpace.locked) {
        return HttpResponse.json(
            { message: "Parking space is already locked or reserved" },
            { status: 409 }
        );
    }

    // Parse lock_duration (e.g., "PT15M" for 15 minutes)
    const durationMatch = lock_duration.match(/PT(\d+)M/);
    const lockDurationMinutes = durationMatch
        ? parseInt(durationMatch[1], 10)
        : 15;
    const lockDurationMs = lockDurationMinutes * 60 * 1000;

    const expiresAtDate = new Date(Date.now() + lockDurationMs);
    const expiresAt = expiresAtDate.toISOString();

    // Lock the parking space
    parkingSpace.locked = true;
    parkingSpace.locked_by = authenticatedUserId; // Use the hardcoded user ID
    parkingSpace.locked_until = expiresAt;

    return HttpResponse.json(
        { expiresAt: expiresAtDate.getTime() },
        { status: 200 }
    );
});

/**
 * Handler for POST /v1/reservations/unlock
 * Unlock a Parking Space
 */
export const unlockParkingSpaceHandler = http.post<
    never,
    any,
    {} | { message: string }
>("/v1/reservations/unlock", async ({ request }) => {
    const body: any = await request.json(); // Parse as JSON object
    const parking_space_id = body ? body.parking_space_id : undefined;

    const parkingSpace = spaces.find((space) => space.id === parking_space_id);

    if (!parkingSpace) {
        return HttpResponse.json(
            { message: "Parking space not found" },
            { status: 404 }
        );
    }

    if (!parkingSpace.locked) {
        return HttpResponse.json(
            { message: "Parking space already unlocked" },
            { status: 409 }
        );
    }

    // Unlock the parking space
    parkingSpace.locked = false;
    parkingSpace.locked_by = undefined;
    parkingSpace.locked_until = undefined;

    return HttpResponse.json({}, { status: 200 });
});

/**
 * **Export Parking Space Handlers**
 */
export const parkingSpaceHandlers = [
    getParkingSpaceHandler,
    getOwnedParkingSpacesHandler, // Updated handler here
    lockParkingSpaceHandler,
    unlockParkingSpaceHandler,
];
