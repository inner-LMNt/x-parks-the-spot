// src/mocks/handlers/auth/loginHandler.ts

import { http, HttpResponse } from 'msw';
import { findUserByEmail, generateToken } from '../../data/auth/authData';
import { LoginRequest, AuthResponse } from '@/types/type';

/**
 * Handler for POST /auth/login
 */
export const loginHandler = http.post<never, LoginRequest>('v1/auth/login', async ({ params, request })=>{

    // Find user by email
    const data = await request.json();
    console.log(data)
    const user = findUserByEmail(data.email);
    if (user && data.password === "password123") { // Replace with actual password validation when implemented
        const token: AuthResponse = {
            userId: "1a2b3c4d-5e6f-7g8h-9i10-j11k12l13m14",
            access_token: generateToken(),
            token_type: "Bearer"
        };

        return HttpResponse.json(token, { status: 200 });
    } else {
        return HttpResponse.json({ message: 'Invalid email or password'}, { status: 401 });
    }
});
