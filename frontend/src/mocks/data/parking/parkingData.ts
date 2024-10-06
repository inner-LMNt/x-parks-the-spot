// src/mocks/data/parking/parkingData.ts

import { ParkingSpace } from '@/types/type'

// Mock database of parking spots
const spaces: ParkingSpace[] = [
  { id: '1', owner_id: '1001', location: { latitude: 40.4236, longitude: -86.9217 } },
  { id: '2', owner_id: '1002', location: { latitude: 40.4256, longitude: -86.9237 } },
  { id: '3', owner_id: '1003', location: { latitude: 40.4276, longitude: -86.9257 } },
  { id: '4', owner_id: '1004', location: { latitude: 40.4296, longitude: -86.9277 } },
  { id: '5', owner_id: '1005', location: { latitude: 40.4316, longitude: -86.9297 } },
  { id: '6', owner_id: '1006', location: { latitude: 40.4336, longitude: -86.9317 } },
  { id: '7', owner_id: '1007', location: { latitude: 40.4356, longitude: -86.9337 } },
  { id: '8', owner_id: '1008', location: { latitude: 40.4376, longitude: -86.9357 } },
  { id: '9', owner_id: '1009', location: { latitude: 40.4396, longitude: -86.9377 } },
  { id: '10', owner_id: '1010', location: { latitude: 40.4416, longitude: -86.9397 } },
  { id: '11', owner_id: '1001', location: { latitude: 40.4236, longitude: -86.9237} },
  { id: '12', owner_id: '1001', location: { latitude: 40.4236, longitude: -86.9257} },
  { id: '13', owner_id: '1001', location: { latitude: 40.4236, longitude: -86.9277} },
  { id: '14', owner_id: '1001', location: { latitude: 40.4236, longitude: -86.9297} }, 
]

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

export function userSubmissions(owner_id: string): ParkingSpace[] {
  console.log("Getting user submissions for owner_id", owner_id)
  return spaces.filter(space => space.owner_id === owner_id)
}