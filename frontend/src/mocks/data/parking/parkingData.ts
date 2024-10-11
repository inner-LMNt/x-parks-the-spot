// src/mocks/data/parking/parkingData.ts

import { ParkingSpace, TimeSlot, PricingInfo, Location } from "@/types/type";

// Mock database of parking spots
export const spaces: ParkingSpace[] = [
  {
    id: "1a2b3c4d-5678-90ab-cdef-1234567890ab",
    owner_id: "123e4567-e89b-12d3-a456-426614174000",
    location: {
      latitude: 40.4236,
      longitude: -86.9217,
      address: "123 Main St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["EV Charging", "Covered", "Security Cameras"],
    availability_schedule: [
      {
        day_of_week: "Monday",
        start_time: "2024-10-07T09:00:00Z",
        end_time: "2024-10-07T17:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Tuesday",
        start_time: "2024-10-08T09:00:00Z",
        end_time: "2024-10-08T17:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 5.0,
      dynamic_pricing: true,
      dynamic_pricing_algorithm: "standard",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking1/photo1.jpg",
      "https://example.com/photos/parking1/photo2.jpg",
    ],
    verification_status: "verified",
    dynamic_pricing_enabled: true,
    cancellation_policy: "Free cancellation up to 24 hours before booking.",
    locked: false,
    locked_by: undefined, // No active lock
    locked_until: undefined, // No active lock
    created_at: "2024-09-01T12:00:00Z",
    updated_at: "2024-09-15T12:00:00Z",
  } as ParkingSpace,

  {
    id: "2a2b3c4d-5678-90ab-cdef-1234567890bc",
    owner_id: "223e4567-e89b-12d3-a456-426614174001",
    location: {
      latitude: 40.4256,
      longitude: -86.9237,
      address: "456 Elm St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["Covered", "Security Cameras"],
    availability_schedule: [
      {
        day_of_week: "Wednesday",
        start_time: "2024-10-09T08:00:00Z",
        end_time: "2024-10-09T18:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Thursday",
        start_time: "2024-10-10T08:00:00Z",
        end_time: "2024-10-10T18:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 4.5,
      dynamic_pricing: false,
      dynamic_pricing_algorithm: "",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking2/photo1.jpg",
      "https://example.com/photos/parking2/photo2.jpg",
    ],
    verification_status: "pending",
    dynamic_pricing_enabled: false,
    cancellation_policy: "No cancellations allowed.",
    locked: false,
    locked_by: undefined, // UUID of the user who locked
    locked_until: undefined, // ISO 8601 date-time string
    created_at: "2024-09-05T12:00:00Z",
    updated_at: "2024-09-20T12:00:00Z",
  } as ParkingSpace,

  {
    id: "3a2b3c4d-5678-90ab-cdef-1234567890cd",
    owner_id: "323e4567-e89b-12d3-a456-426614174002",
    location: {
      latitude: 40.4276,
      longitude: -86.9257,
      address: "789 Oak St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["EV Charging", "Covered"],
    availability_schedule: [
      {
        day_of_week: "Friday",
        start_time: "2024-10-11T07:00:00Z",
        end_time: "2024-10-11T19:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Saturday",
        start_time: "2024-10-12T07:00:00Z",
        end_time: "2024-10-12T19:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 6.0,
      dynamic_pricing: true,
      dynamic_pricing_algorithm: "peak_hours",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking3/photo1.jpg",
      "https://example.com/photos/parking3/photo2.jpg",
    ],
    verification_status: "verified",
    dynamic_pricing_enabled: true,
    cancellation_policy: "Free cancellation up to 12 hours before booking.",
    locked: false,
    locked_by: undefined,
    locked_until: undefined,
    created_at: "2024-09-10T12:00:00Z",
    updated_at: "2024-09-25T12:00:00Z",
  } as ParkingSpace,

  {
    id: "4a2b3c4d-5678-90ab-cdef-1234567890de",
    owner_id: "423e4567-e89b-12d3-a456-426614174003",
    location: {
      latitude: 40.4296,
      longitude: -86.9277,
      address: "321 Pine St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["Security Cameras"],
    availability_schedule: [
      {
        day_of_week: "Sunday",
        start_time: "2024-10-13T06:00:00Z",
        end_time: "2024-10-13T20:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Monday",
        start_time: "2024-10-14T06:00:00Z",
        end_time: "2024-10-14T20:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 5.5,
      dynamic_pricing: false,
      dynamic_pricing_algorithm: "",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking4/photo1.jpg",
      "https://example.com/photos/parking4/photo2.jpg",
    ],
    verification_status: "rejected",
    dynamic_pricing_enabled: false,
    cancellation_policy: "No refunds available.",
    locked: false,
    locked_by: undefined, // UUID of the user who locked
    locked_until: undefined,
    created_at: "2024-09-15T12:00:00Z",
    updated_at: "2024-09-30T12:00:00Z",
  } as ParkingSpace,

  {
    id: "5a2b3c4d-5678-90ab-cdef-1234567890ef",
    owner_id: "523e4567-e89b-12d3-a456-426614174004",
    location: {
      latitude: 38.37334,
      longitude: -85.596661,
      address: "3212 Deer Pointe Pl, Prospect, KY",
    } as Location,
    is_paid: true,
    features: ["Covered", "EV Charging"],
    availability_schedule: [
      {
        day_of_week: "Tuesday",
        start_time: "2024-10-15T05:00:00Z",
        end_time: "2024-10-15T21:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Wednesday",
        start_time: "2024-10-16T05:00:00Z",
        end_time: "2024-10-16T21:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 5.0,
      dynamic_pricing: true,
      dynamic_pricing_algorithm: "standard",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking5/photo1.jpg",
      "https://example.com/photos/parking5/photo2.jpg",
    ],
    verification_status: "verified",
    dynamic_pricing_enabled: true,
    cancellation_policy: "Free cancellation up to 24 hours before booking.",
    locked: false,
    locked_by: undefined,
    locked_until: undefined,
    created_at: "2024-09-20T12:00:00Z",
    updated_at: "2024-10-05T12:00:00Z",
  } as ParkingSpace,

  {
    id: "6a2b3c4d-5678-90ab-cdef-1234567890fa",
    owner_id: "623e4567-e89b-12d3-a456-426614174005",
    location: {
      latitude: 38.376391,
      longitude: -85.593005,
      address: "12613 Ridgemoor Dr, Prospect, KY",
    } as Location,
    is_paid: true,
    features: ["Security Cameras", "EV Charging"],
    availability_schedule: [
      {
        day_of_week: "Thursday",
        start_time: "2024-10-17T04:00:00Z",
        end_time: "2024-10-17T22:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Friday",
        start_time: "2024-10-18T04:00:00Z",
        end_time: "2024-10-18T22:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 6.0,
      dynamic_pricing: false,
      dynamic_pricing_algorithm: "",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking6/photo1.jpg",
      "https://example.com/photos/parking6/photo2.jpg",
    ],
    verification_status: "pending",
    dynamic_pricing_enabled: false,
    cancellation_policy: "No cancellations allowed.",
    locked: false,
    locked_by: undefined, // UUID of the user who locked
    locked_until: undefined,
    created_at: "2024-09-25T12:00:00Z",
    updated_at: "2024-10-10T12:00:00Z",
  } as ParkingSpace,

  {
    id: "7a2b3c4d-5678-90ab-cdef-1234567890gb",
    owner_id: "723e4567-e89b-12d3-a456-426614174006",
    location: {
      latitude: 40.4356,
      longitude: -86.9337,
      address: "159 Walnut St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["Covered"],
    availability_schedule: [
      {
        day_of_week: "Saturday",
        start_time: "2024-10-20T03:00:00Z",
        end_time: "2024-10-20T23:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Sunday",
        start_time: "2024-10-21T03:00:00Z",
        end_time: "2024-10-21T23:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 4.0,
      dynamic_pricing: true,
      dynamic_pricing_algorithm: "standard",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking7/photo1.jpg",
      "https://example.com/photos/parking7/photo2.jpg",
    ],
    verification_status: "verified",
    dynamic_pricing_enabled: true,
    cancellation_policy: "Free cancellation up to 24 hours before booking.",
    locked: false,
    locked_by: undefined,
    locked_until: undefined,
    created_at: "2024-09-30T12:00:00Z",
    updated_at: "2024-10-15T12:00:00Z",
  } as ParkingSpace,

  {
    id: "8a2b3c4d-5678-90ab-cdef-1234567890hc",
    owner_id: "823e4567-e89b-12d3-a456-426614174007",
    location: {
      latitude: 40.4376,
      longitude: -86.9357,
      address: "753 Poplar St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["EV Charging"],
    availability_schedule: [
      {
        day_of_week: "Monday",
        start_time: "2024-10-22T02:00:00Z",
        end_time: "2024-10-22T24:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Tuesday",
        start_time: "2024-10-23T02:00:00Z",
        end_time: "2024-10-23T24:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 5.5,
      dynamic_pricing: false,
      dynamic_pricing_algorithm: "",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking8/photo1.jpg",
      "https://example.com/photos/parking8/photo2.jpg",
    ],
    verification_status: "rejected",
    dynamic_pricing_enabled: false,
    cancellation_policy: "No refunds available.",
    locked: false,
    locked_by: undefined,
    locked_until: undefined,
    created_at: "2024-10-05T12:00:00Z",
    updated_at: "2024-10-20T12:00:00Z",
  } as ParkingSpace,

  {
    id: "9a2b3c4d-5678-90ab-cdef-1234567890id",
    owner_id: "923e4567-e89b-12d3-a456-426614174008",
    location: {
      latitude: 40.4396,
      longitude: -86.9377,
      address: "852 Chestnut St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["Covered", "Security Cameras"],
    availability_schedule: [
      {
        day_of_week: "Wednesday",
        start_time: "2024-10-24T01:00:00Z",
        end_time: "2024-10-24T23:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Thursday",
        start_time: "2024-10-25T01:00:00Z",
        end_time: "2024-10-25T23:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 6.5,
      dynamic_pricing: true,
      dynamic_pricing_algorithm: "peak_hours",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking9/photo1.jpg",
      "https://example.com/photos/parking9/photo2.jpg",
    ],
    verification_status: "verified",
    dynamic_pricing_enabled: true,
    cancellation_policy: "Free cancellation up to 12 hours before booking.",
    locked: false,
    locked_by: undefined,
    locked_until: undefined,
    created_at: "2024-10-10T12:00:00Z",
    updated_at: "2024-10-25T12:00:00Z",
  } as ParkingSpace,

  {
    id: "10a2b3c4d-5678-90ab-cdef-1234567890je",
    owner_id: "a23e4567-e89b-12d3-a456-426614174009",
    location: {
      latitude: 40.4416,
      longitude: -86.9397,
      address: "951 Spruce St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["EV Charging", "Covered", "Security Cameras"],
    availability_schedule: [
      {
        day_of_week: "Friday",
        start_time: "2024-10-26T00:00:00Z",
        end_time: "2024-10-26T22:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Saturday",
        start_time: "2024-10-27T00:00:00Z",
        end_time: "2024-10-27T22:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 7.0,
      dynamic_pricing: false,
      dynamic_pricing_algorithm: "",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking10/photo1.jpg",
      "https://example.com/photos/parking10/photo2.jpg",
    ],
    verification_status: "pending",
    dynamic_pricing_enabled: false,
    cancellation_policy: "No cancellations allowed.",
    locked: true,
    locked_by: undefined, // UUID of the user who locked
    locked_until: undefined,
    created_at: "2024-10-15T12:00:00Z",
    updated_at: "2024-10-30T12:00:00Z",
  } as ParkingSpace,

  {
    id: "mgdonal",
    owner_id: "a23e4567-e89b-12d3-a456-426614174009",
    location: {
      latitude: 40.431040,
      longitude: -86.913150,
      address: "951 Spruce St, Indianapolis, IN",
    } as Location,
    is_paid: true,
    features: ["EV Charging", "Covered", "Security Cameras"],
    availability_schedule: [
      {
        day_of_week: "Friday",
        start_time: "2024-10-26T00:00:00Z",
        end_time: "2024-10-26T22:00:00Z",
      } as TimeSlot,
      {
        day_of_week: "Saturday",
        start_time: "2024-10-27T00:00:00Z",
        end_time: "2024-10-27T22:00:00Z",
      } as TimeSlot,
      // Add more time slots as needed
    ],
    pricing_info: {
      base_price: 7.0,
      dynamic_pricing: false,
      dynamic_pricing_algorithm: "",
    } as PricingInfo,
    photos: [
      "https://example.com/photos/parking10/photo1.jpg",
      "https://example.com/photos/parking10/photo2.jpg",
    ],
    verification_status: "pending",
    dynamic_pricing_enabled: false,
    cancellation_policy: "No cancellations allowed.",
    locked: true,
    locked_by: undefined, // UUID of the user who locked
    locked_until: undefined,
    created_at: "2024-10-15T12:00:00Z",
    updated_at: "2024-10-30T12:00:00Z",
  } as ParkingSpace,
];

/**
 * Find parking spots within a given radius of a location
 * @param lat Latitude of the center point
 * @param lng Longitude of the center point
 * @param radius Radius in kilometers
 * @returns Array of parking spots within the radius
 */
export function findParking(
  lat: number,
  lng: number,
  radius: number
): ParkingSpace[] {
  console.log("Finding parking spots within radius", radius, "km of", lat, lng);
  return spaces.filter((space) => {
    const distance = Math.sqrt(
      Math.pow(space.location.latitude - lat, 2) +
        Math.pow(space.location.longitude - lng, 2)
    );
    // Rough approximation: 1 degree is about 111 km

    return distance * 111 <= radius
  })
}

export function userSubmissions(owner_id: string): ParkingSpace[] {
  console.log("Getting user submissions for owner_id", owner_id)
  return spaces.filter(space => space.owner_id === owner_id)
}
