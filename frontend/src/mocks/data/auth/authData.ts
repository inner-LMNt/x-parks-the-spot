// src/mocks/authData.ts

import { User } from "@/types/type"

// Type Aliases for Convenience

// In-memory mock user database
// src/mocks/authData.ts

export const mockUsers: User[] = [
  {
    id: "a927ff6d-9782-4b13-ac04-831f1066d503",
    email: "test@example.com",
    full_name: "Test User",
    account_status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    renter_profile: {
      car_info: [
        {
          id: "c927ff6d-9782-4b13-ac04-831f1066d503",
          make: "Toyota",
          model: "Corolla",
          license_plate: "ABC-1234",
          license_plate_state: "CA",
          default: true,
        },
      ],
      favorites: [],
    },
  },
  {
    id: "b927ff6d-9782-4b13-ac04-831f1066d503",
    email: "owner@example.com",
    full_name: "Owner User",
    account_status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_profile: {
      parking_spaces: [],
      earnings: 0,
    },
  },
  // Add more mock users as needed
]

// Function to generate a random token
export const generateToken = (): string => {
  return "token"
}

// Function to find a user by email
export const findUserByEmail = (email: string): User | undefined => {
  return mockUsers.find((user) => user.email === email)
}

// Function to find a user by ID
export const findUserById = (id: string): User | undefined => {
  return mockUsers.find((user) => user.id === id)
}

// Function to add a new user
export const addUser = (user: User): void => {
  mockUsers.push(user)
}

// Function to update a user's password
export const updateUserPassword = (
  userId: string,
  newPassword: string,
): void => {
  const user = findUserById(userId)
  if (user) {
    // **Important:** In this mock setup, the `User` schema does not include a `password` field.
    // To fully implement password updates, consider adding a `password` field to the `User` schema
    // in your OpenAPI specification and regenerate the types using `openapi-typescript`.
    // For demonstration purposes, we'll assume a `password` field exists.
    ;(user as any).password = newPassword
    user.updated_at = new Date().toISOString()
  }
}
