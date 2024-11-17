// src/mocks/data/reservations/reservationsData.ts

import { Reservation } from "@/types/type"

export const reservations: Reservation[] = [
  {
    id: "1",
    parking_space_id: "1a2b3c4d-5678-90ab-cdef-1234567890ab",
    renter_id: "user1",
    owner_id: "owner1",
    start_time: "2024-10-03T09:00:00Z",
    end_time: "2024-10-03T11:00:00Z",
    status: "booked",
    car_info_id: "car1",
    created_at: "2024-10-01T12:00:00Z",
    updated_at: "2024-10-01T12:00:00Z",
    price: 10.0,
    name: "aa",
    location: {
      address: "add",
      latitude: 0,
      longitude: 0,
    },
  },
  // Add more reservations as needed
]
