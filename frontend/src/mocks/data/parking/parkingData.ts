// src/mocks/data/parking/parkingData.ts

import { ParkingSpace } from '@/types/type'

// Mock database of parking spots
export const spaces: ParkingSpace[] = [
  // Existing Parking Space (id: '1')
  {
    id: '1',
    owner_id: '123e4567-e89b-12d3-a456-426614174000',
    location: {
      latitude: 40.4236,
      longitude: -86.9217,
    },
    features: ['EV Charging', 'Covered', 'Security Cameras'],
    availability_schedule: [
      {
        start_time: '2024-10-05T09:00:00Z',
        end_time: '2024-10-05T17:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 5.0,
      daily_rate: 20.0,
      weekend_rate: 25.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking1/photo1.jpg',
      'https://example.com/photos/parking1/photo2.jpg',
    ],
    verification_status: 'verified',
    dynamic_pricing_enabled: true,
    cancellation_policy: 'Free cancellation up to 24 hours before booking.',
    isLocked: false,
    lockExpiresAt: null, // No active lock
    created_at: '2024-09-01T12:00:00Z',
    updated_at: '2024-09-15T12:00:00Z',
  },

  // New Parking Spaces (id: '2' to '10')
  {
    id: '2',
    owner_id: '223e4567-e89b-12d3-a456-426614174001',
    location: {
      latitude: 40.4256,
      longitude: -86.9237,
    },
    features: ['Covered', 'Security Cameras'],
    availability_schedule: [
      {
        start_time: '2024-10-06T08:00:00Z',
        end_time: '2024-10-06T18:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 4.5,
      daily_rate: 18.0,
      weekend_rate: 22.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking2/photo1.jpg',
      'https://example.com/photos/parking2/photo2.jpg',
    ],
    verification_status: 'pending',
    dynamic_pricing_enabled: false,
    cancellation_policy: 'No cancellations allowed.',
    isLocked: true,
    lockExpiresAt: 1700000000000, // Example timestamp (milliseconds since epoch)
    created_at: '2024-09-05T12:00:00Z',
    updated_at: '2024-09-20T12:00:00Z',
  },
  {
    id: '3',
    owner_id: '323e4567-e89b-12d3-a456-426614174002',
    location: {
      latitude: 40.4276,
      longitude: -86.9257,
    },
    features: ['EV Charging', 'Covered'],
    availability_schedule: [
      {
        start_time: '2024-10-07T07:00:00Z',
        end_time: '2024-10-07T19:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 6.0,
      daily_rate: 22.0,
      weekend_rate: 28.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking3/photo1.jpg',
      'https://example.com/photos/parking3/photo2.jpg',
    ],
    verification_status: 'verified',
    dynamic_pricing_enabled: true,
    cancellation_policy: 'Free cancellation up to 12 hours before booking.',
    isLocked: false,
    lockExpiresAt: null,
    created_at: '2024-09-10T12:00:00Z',
    updated_at: '2024-09-25T12:00:00Z',
  },
  {
    id: '4',
    owner_id: '423e4567-e89b-12d3-a456-426614174003',
    location: {
      latitude: 40.4296,
      longitude: -86.9277,
    },
    features: ['Security Cameras'],
    availability_schedule: [
      {
        start_time: '2024-10-08T06:00:00Z',
        end_time: '2024-10-08T20:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 5.5,
      daily_rate: 19.0,
      weekend_rate: 24.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking4/photo1.jpg',
      'https://example.com/photos/parking4/photo2.jpg',
    ],
    verification_status: 'rejected',
    dynamic_pricing_enabled: false,
    cancellation_policy: 'No refunds available.',
    isLocked: true,
    lockExpiresAt: 1700005000000, // Example timestamp (milliseconds since epoch)
    created_at: '2024-09-15T12:00:00Z',
    updated_at: '2024-09-30T12:00:00Z',
  },
  {
    id: '5',
    owner_id: '523e4567-e89b-12d3-a456-426614174004',
    location: {
      latitude: 40.4316,
      longitude: -86.9297,
    },
    features: ['Covered', 'EV Charging'],
    availability_schedule: [
      {
        start_time: '2024-10-09T05:00:00Z',
        end_time: '2024-10-09T21:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 5.0,
      daily_rate: 20.0,
      weekend_rate: 25.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking5/photo1.jpg',
      'https://example.com/photos/parking5/photo2.jpg',
    ],
    verification_status: 'verified',
    dynamic_pricing_enabled: true,
    cancellation_policy: 'Free cancellation up to 24 hours before booking.',
    isLocked: false,
    lockExpiresAt: null,
    created_at: '2024-09-20T12:00:00Z',
    updated_at: '2024-10-05T12:00:00Z',
  },
  {
    id: '6',
    owner_id: '623e4567-e89b-12d3-a456-426614174005',
    location: {
      latitude: 40.4336,
      longitude: -86.9317,
    },
    features: ['Security Cameras', 'EV Charging'],
    availability_schedule: [
      {
        start_time: '2024-10-10T04:00:00Z',
        end_time: '2024-10-10T22:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 6.0,
      daily_rate: 24.0,
      weekend_rate: 30.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking6/photo1.jpg',
      'https://example.com/photos/parking6/photo2.jpg',
    ],
    verification_status: 'pending',
    dynamic_pricing_enabled: false,
    cancellation_policy: 'No cancellations allowed.',
    isLocked: true,
    lockExpiresAt: 1700010000000, // Example timestamp (milliseconds since epoch)
    created_at: '2024-09-25T12:00:00Z',
    updated_at: '2024-10-10T12:00:00Z',
  },
  {
    id: '7',
    owner_id: '723e4567-e89b-12d3-a456-426614174006',
    location: {
      latitude: 40.4356,
      longitude: -86.9337,
    },
    features: ['Covered'],
    availability_schedule: [
      {
        start_time: '2024-10-11T03:00:00Z',
        end_time: '2024-10-11T23:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 4.0,
      daily_rate: 16.0,
      weekend_rate: 20.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking7/photo1.jpg',
      'https://example.com/photos/parking7/photo2.jpg',
    ],
    verification_status: 'verified',
    dynamic_pricing_enabled: true,
    cancellation_policy: 'Free cancellation up to 24 hours before booking.',
    isLocked: false,
    lockExpiresAt: null,
    created_at: '2024-09-30T12:00:00Z',
    updated_at: '2024-10-15T12:00:00Z',
  },
  {
    id: '8',
    owner_id: '823e4567-e89b-12d3-a456-426614174007',
    location: {
      latitude: 40.4376,
      longitude: -86.9357,
    },
    features: ['EV Charging'],
    availability_schedule: [
      {
        start_time: '2024-10-12T02:00:00Z',
        end_time: '2024-10-12T24:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 5.5,
      daily_rate: 22.0,
      weekend_rate: 27.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking8/photo1.jpg',
      'https://example.com/photos/parking8/photo2.jpg',
    ],
    verification_status: 'rejected',
    dynamic_pricing_enabled: false,
    cancellation_policy: 'No refunds available.',
    isLocked: true,
    lockExpiresAt: 1700015000000, // Example timestamp (milliseconds since epoch)
    created_at: '2024-10-05T12:00:00Z',
    updated_at: '2024-10-20T12:00:00Z',
  },
  {
    id: '9',
    owner_id: '923e4567-e89b-12d3-a456-426614174008',
    location: {
      latitude: 40.4396,
      longitude: -86.9377,
    },
    features: ['Covered', 'Security Cameras'],
    availability_schedule: [
      {
        start_time: '2024-10-13T01:00:00Z',
        end_time: '2024-10-13T23:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 6.5,
      daily_rate: 26.0,
      weekend_rate: 32.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking9/photo1.jpg',
      'https://example.com/photos/parking9/photo2.jpg',
    ],
    verification_status: 'verified',
    dynamic_pricing_enabled: true,
    cancellation_policy: 'Free cancellation up to 12 hours before booking.',
    isLocked: false,
    lockExpiresAt: null,
    created_at: '2024-10-10T12:00:00Z',
    updated_at: '2024-10-25T12:00:00Z',
  },
  {
    id: '10',
    owner_id: 'a23e4567-e89b-12d3-a456-426614174009',
    location: {
      latitude: 40.4416,
      longitude: -86.9397,
    },
    features: ['EV Charging', 'Covered', 'Security Cameras'],
    availability_schedule: [
      {
        start_time: '2024-10-14T00:00:00Z',
        end_time: '2024-10-14T22:00:00Z',
      },
      // Add more time slots as needed
    ],
    pricing_info: {
      hourly_rate: 7.0,
      daily_rate: 28.0,
      weekend_rate: 35.0,
      // Add other pricing details if necessary
    },
    photos: [
      'https://example.com/photos/parking10/photo1.jpg',
      'https://example.com/photos/parking10/photo2.jpg',
    ],
    verification_status: 'pending',
    dynamic_pricing_enabled: false,
    cancellation_policy: 'No cancellations allowed.',
    isLocked: true,
    lockExpiresAt: 1700020000000, // Example timestamp (milliseconds since epoch)
    created_at: '2024-10-15T12:00:00Z',
    updated_at: '2024-10-30T12:00:00Z',
  },
];

/**
 * Find parking spots within a given radius of a location
 * @param lat Latitude of the center point
 * @param lng Longitude of the center point
 * @param radius Radius in kilometers
 * @returns Array of parking spots within the radius
 */
export function findParking(lat: number, lng: number, radius: number): ParkingSpace[] {
  console.log("Finding parking spots within radius", radius, "km of", lat, lng);
  return spaces.filter(space => {
    const distance = Math.sqrt(
      Math.pow(space.location.latitude - lat, 2) + Math.pow(space.location.longitude - lng, 2)
    )
    // Rough approximation: 1 degree is about 111 km
    return distance * 111 <= radius
  })
}