// src/mocks/handlers/auth/passwordResetHandler.ts

import { http, HttpResponse } from 'msw';
import { findUserByEmail, updateUserPassword } from '@/mocks/data/auth/authData';
import { PasswordResetRequest, PasswordResetConfirmRequest } from '@/types/type';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory store for password reset tokens
 * Key: Reset Token
 * Value: User ID
 */
const passwordResetTokens: Record<string, string> = {};

/**
 * Handler for POST /auth/password-reset
 * Initiates a password reset by generating a token
 */
export const resetHandler = http.post<never,PasswordResetRequest>(
    'v1/auth/password-reset',
    async ({ request , params}) => {
        const data: PasswordResetRequest = await request.json();
        const email = data.email;
        console.log(email)
        // Check if user exists
        const user = findUserByEmail(email);
        if (!user) {
            return HttpResponse.json(
                { message: `User with email ${email} not found` },
                { status: 400 }
            );
        }

        // Generate a reset token
        const resetToken = uuidv4();
        passwordResetTokens[resetToken] = user.id ?? '';

        // In a real application, an email would be sent to the user with the reset token
        console.log(`Password reset token for ${email}: ${resetToken}`);

        return HttpResponse.json(
            { message: 'Password reset email sent' },
            { status: 200 }
        );
    }
);

/**
 * Handler for POST /auth/password-reset/confirm
 * Confirms the password reset using the token and updates the password
 */
export const resetConfirmHandler = http.post<PasswordResetConfirmRequest>(
    'v1/auth/password-reset/confirm',
    async ({ request, params, requestId }) => {
        const data = await request.json();
        const { token, new_password } = data as PasswordResetConfirmRequest;

        // Validate token
        const userId = passwordResetTokens[token];
        if (!userId) {
            return HttpResponse.json(
                { message: "Invalid token or password" },
                { status: 400 }
            );
        }

        // Update user's password
        updateUserPassword(userId, new_password);

        // Remove the used token
        delete passwordResetTokens[token];

        return HttpResponse.json(
            { message: "Password reset successful" },
            { status: 200 }
        );
    }
);
