// src/mocks/handlers/auth/registerHandler.ts

import { http, HttpResponse } from 'msw';
import { addUser, findUserByEmail, generateToken } from '../../data/auth/authData';
import { RegisterRequest, AuthResponse, User } from '@/types/type';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handler for POST /auth/register
 */
export const registerHandler = http.post<RegisterRequest>(
    '/auth/register',
    async ({ request, params, requestId }) => {
        const { email, password, full_name, roles } = request.body as RegisterRequest;

        // Check if user already exists
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return HttpResponse.json(
                { message: "User already exists" },
                { status: 400 }
            );
        }

        // Create new user
        const newUser: User = {
            id: uuidv4(),
            email,
            full_name,
            roles,
            account_status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Initialize profiles based on roles
            ...(roles.includes("renter") && {
                renter_profile: {
                    car_info: [],
                    favorites: []
                }
            }),
            ...(roles.includes("owner") && {
                owner_profile: {
                    parking_spaces: [],
                    earnings: 0,
                    verification_status: "pending"
                }
            }),
            ...(roles.includes("spot_finder") && {
                spot_finder_profile: {
                    submissions: [],
                    points_accumulated: 0
                }
            })
        };

        // Add user to mock database
        addUser(newUser);

        // Generate token
        const token: AuthResponse = {
            access_token: generateToken(),
            token_type: "Bearer"
        };

        return HttpResponse.json(token, { status: 201 });
    }
);
