import { ParkingSpace } from '@/types/type'

// Mock database of parking spots
const spaces: ParkingSpace[] = [
  {id: '1', location: {latitude: 40.7128, longitude: -74.0060}},
  {id: '2', location: {latitude: 40.7829, longitude: -73.9654}},
  {id: '3', location: {latitude: 40.7580, longitude: -73.9855}},
  {id: '4', location: {latitude: 40.7128, longitude: -74.0060}},
]

/**
 * Find parking spots within a given radius of a location
 * @param lat Latitude of the center point
 * @param lng Longitude of the center point
 * @param radius Radius in kilometers
 * @returns Array of parking spots within the radius
 */
export function findParking(lat: number, lng: number, radius: number): ParkingSpace[] {
  // This is a simplified version. In a real application, you'd use a more accurate
  // distance calculation (like the Haversine formula) and possibly a spatial index.
  return spaces.filter(space => {
    const distance = Math.sqrt(
      Math.pow(space.location.latitude - lat, 2) + Math.pow(space.location.longitude - lng, 2)
    )
    // Rough approximation: 1 degree is about 111 km
    return distance * 111 <= radius
  })
}