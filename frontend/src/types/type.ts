// src/types/type.ts

import { components } from './generated';

/**
 * Type Aliases for API Schemas
 */

/**
 * **Authentication Types**
 */
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];

export type PasswordResetRequest = components["schemas"]["PasswordResetRequest"];
export type PasswordResetConfirmRequest = components["schemas"]["PasswordResetConfirmRequest"];

/**
 * **User Types**
 */
export type User = components["schemas"]["User"];
export type PublicUserProfile = components["schemas"]["PublicUserProfile"];
export type UserUpdateRequest = components["schemas"]["UserUpdateRequest"];
export type NotificationPreferences = components["schemas"]["NotificationPreferences"];
export type CarInfo = components["schemas"]["CarInfo"];
export type RenterProfile = components["schemas"]["RenterProfile"];
export type OwnerProfile = components["schemas"]["OwnerProfile"];
export type SpotFinderProfile = components["schemas"]["SpotFinderProfile"];

/**
 * **Parking Space Types**
 */
export type ParkingSpace = components["schemas"]["ParkingSpace"];
export type ParkingSpaceSummary = components["schemas"]["ParkingSpaceSummary"];
export type ParkingSpaceCreateRequest = components["schemas"]["ParkingSpaceCreateRequest"];
export type ParkingSpaceUpdateRequest = components["schemas"]["ParkingSpaceUpdateRequest"];

/**
 * **Shared Types**
 */
export type Location = components["schemas"]["Location"];
export type TimeSlot = components["schemas"]["TimeSlot"];
export type PricingInfo = components["schemas"]["PricingInfo"];

/**
 * **Reservation Types**
 */
export type Reservation = components["schemas"]["Reservation"];
export type ReservationCreateRequest = components["schemas"]["ReservationCreateRequest"];
export type ReservationUpdateRequest = components["schemas"]["ReservationUpdateRequest"];

/**
 * **Search Type**
 */
export interface SearchRequest {
  latitude: number;
  longitude: number;
  radius: number;
  min_price?: number;  // Minimum price filter
  max_price?: number;  // Maximum price filter
  start_time?: string; // Start time filter
  end_time?: string;   // End time filter
  features?: string[]; // List of features to filter parking spots
}



export type SearchResponse = {
  spots: ParkingSpaceSummary[];
};

/**
 * **Spot Finder Types**
 */
export type SpotFinderSubmission = components["schemas"]["SpotFinderSubmission"];

/**
 * **Notification Types**
 */
export type Notification = components["schemas"]["Notification"];
