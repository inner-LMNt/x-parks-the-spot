// src/mocks/handlers/auth/registerHandler.ts

import { http, HttpResponse } from 'msw';
import { addUser, findUserByEmail, generateToken } from '../../data/auth/authData';
import { RegisterRequest, AuthResponse, User } from '@/types/type';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handler for POST /auth/register
 */
export const registerHandler = http.post<never,RegisterRequest>(
    'v1/auth/register',
    async ({ request, params }) => {
        const data = await request.json();
        const { email, password, full_name } = data as RegisterRequest;
        // Check if user already exists
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return HttpResponse.json(
                { message: "User already exists" },
                { status: 401 }
            );
        }
        const newUuid = uuidv4();
        // Create new user
        const newUser: User = {
            id: newUuid,
            email,
            full_name,
            account_status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Initialize profiles based on role
            renter_profile: {
                car_info: [],
                favorites: [],
            },
            owner_profile: {
                parking_spaces: [],
                earnings: 0,
            },
            spot_finder_profile: {
                submissions: [],
                points_accumulated: 0
            }
        };

        // Add user to mock database
        addUser(newUser);
        const token = generateToken()
        // Generate token
        const res: AuthResponse = {
            access_token: token,
            userId: newUuid
        };

        return HttpResponse.json(res, { status: 201 });
    }
);
