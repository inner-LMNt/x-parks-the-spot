// src/features/user/userSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axiosInstance'; // Ensure the path is correct
import {LoginRequest, RegisterRequest, AuthResponse, User, PasswordResetRequest} from '@/types/type';

/**
 * Interface for the user slice state
 */
interface UserState {
    isLoggedIn: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
}

const initialState: UserState = {
    isLoggedIn: false,
    user: null,
    loading: false,
    error: null,
};

/**
 * Define the login thunk
 */
export const login = createAsyncThunk<
    AuthResponse, // Return type
    LoginRequest, // Argument type
    { rejectValue: string } // ThunkAPI config
>(
    'user/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await axios.post<AuthResponse>('auth/login', credentials);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

/**
 * Define the register thunk
 */
export const register_acc = createAsyncThunk<
    AuthResponse, // Return type of the payload creator
    RegisterRequest, // First argument to the payload creator
    { rejectValue: string } // Types for ThunkAPI
>(
    'user/register',
    async (credentials, { rejectWithValue }) => {
        try {
            console.log(credentials)
            const response = await axios.post<AuthResponse>('auth/register', credentials);
            return response.data;
        } catch (error: any) {
            // Extract a meaningful error message
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

/**
 * Define the logout thunk
 */
export const logout = createAsyncThunk<
    void, // Return type of the payload creator
    void, // First argument to the payload creator
    { rejectValue: string } // Types for ThunkAPI
>(
    'user/logout',
    async (_, { rejectWithValue }) => {
        try {
            // Implement logout logic if needed (e.g., API call to invalidate token)
            await axios.post('auth/logout');
            return;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Logout failed');
        }
    }
);

export const reset = createAsyncThunk<
    void, // Return type of the payload creator
    string, // First argument to the payload creator (email)
    { rejectValue: string } // Types for ThunkAPI
>(
    'user/reset',
    async (email: string, { rejectWithValue }) => {
        try {
            const response = await axios.post('auth/password-reset', { email } as PasswordResetRequest);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Password reset failed');
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            // Handle login
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.isLoggedIn = true;
                state.user = action.payload.user; // Ensure AuthResponse includes 'user'
                // Optionally, store tokens or other necessary data if included in AuthResponse
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Login failed';
            })
            // Handle register
            .addCase(register_acc.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register_acc.fulfilled, (state, action) => {
                state.loading = false;
                state.isLoggedIn = true;
                state.user = action.payload.user; // Ensure AuthResponse includes 'user'
                // Optionally, store tokens or other necessary data if included in AuthResponse
            })
            .addCase(register_acc.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Registration failed';
            })
            // Handle logout
            .addCase(logout.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.loading = false;
                state.isLoggedIn = false;
                state.user = null;
            })
            .addCase(logout.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Logout failed';
            })
            .addCase(reset.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(reset.fulfilled, (state) => {
                state.loading = false;
                state.isLoggedIn = false;
                state.user = null;
            })
            .addCase(reset.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Logout failed';
            });
    },
});

export default userSlice.reducer;
