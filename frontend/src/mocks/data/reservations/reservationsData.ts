// src/mocks/data/reservations/reservationsData.ts

import { Reservation } from '@/types/type';

export const reservations: Reservation[] = [
    {
        id: '1',
        parking_space_id: '1a2b3c4d-5678-90ab-cdef-1234567890ab',
        renter_id: 'user1',
        owner_id: 'owner1',
        start_time: '2024-10-15T09:00:00Z',
        end_time: '2024-10-15T11:00:00Z',
        status: 'booked',
        car_info: {
            id: 'car1',
            make: 'Toyota',
            model: 'Camry',
            year: 2020,
            color: 'Blue',
            license_plate: 'ABC123',
        },
        created_at: '2024-10-01T12:00:00Z',
        updated_at: '2024-10-01T12:00:00Z',
    },
    // Add more reservations as needed
];
