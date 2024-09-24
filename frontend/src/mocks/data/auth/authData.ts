// src/mocks/authData.ts

import {User} from "@/types/type";

// Type Aliases for Convenience


// In-memory mock user database
// src/mocks/authData.ts

export const mockUsers: User[] = [
    {
        id: "1a2b3c4d-5e6f-7g8h-9i10-j11k12l13m14",
        email: "test@example.com",
        full_name: "Test User",
        roles: ["renter"],
        account_status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        renter_profile: {
            car_info: [
                {
                    id: "car-uuid-1",
                    make: "Toyota",
                    model: "Corolla",
                    license_plate: "ABC-1234",
                    default: true
                }
            ],
            favorites: []
        }
    },
    {
        id: "2b3c4d5e-6f7g-8h9i-10j11-k12l13m14n15",
        email: "owner@example.com",
        full_name: "Owner User",
        roles: ["owner"],
        account_status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_profile: {
            parking_spaces: [],
            earnings: 0,
            verification_status: "verified"
        }
    },
    {
        id: "3c4d5e6f-7g8h-9i10-j11k-12l13m14n15o",
        email: "admin@example.com",
        full_name: "Admin User",
        roles: ["admin"],
        account_status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Initialize profiles if necessary
    }
    // Add more mock users as needed
];


// In-memory store for password reset tokens
const passwordResetTokens: Record<string, string> = {};

// Function to generate a mock JWT token (for simplicity, using a static token)
export const generateToken = (): string => "fake-jwt-token";

// Function to find a user by email
export const findUserByEmail = (email: string): User | undefined => {
    return mockUsers.find(user => user.email === email);
};

// Function to find a user by ID
export const findUserById = (id: string): User | undefined => {
    return mockUsers.find(user => user.id === id);
};

// Function to add a new user
export const addUser = (user: User): void => {
    mockUsers.push(user);
};

// Function to update a user's password
export const updateUserPassword = (userId: string, newPassword: string): void => {
    const user = findUserById(userId);
    if (user) {
        // **Important:** In this mock setup, the `User` schema does not include a `password` field.
        // To fully implement password updates, consider adding a `password` field to the `User` schema
        // in your OpenAPI specification and regenerate the types using `openapi-typescript`.
        // For demonstration purposes, we'll assume a `password` field exists.
        (user as any).password = newPassword;
        user.updated_at = new Date().toISOString();
    }
};
