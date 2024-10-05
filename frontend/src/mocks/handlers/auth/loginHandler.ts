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
        const id : string = user.id ?? 'a927ff6d-9782-4b13-ac04-831f1066d503'
        const token: AuthResponse = {
            userId: id,
            access_token: generateToken(),
        };

        return HttpResponse.json(token, { status: 200 });
    } else {
        return HttpResponse.json({ message: 'Invalid email or password'}, { status: 401 });
    }
});
