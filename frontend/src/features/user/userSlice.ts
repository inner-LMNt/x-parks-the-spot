// src/features/user/userSlice.ts

import {createSlice, createAsyncThunk, UnknownAction, PayloadAction, isAnyOf} from '@reduxjs/toolkit';
import axios from '../../api/axiosInstance'; // Ensure the path is correct
import {LoginRequest, RegisterRequest, AuthResponse, User, PasswordResetRequest} from '@/types/type';

/**
 * Interface for the user slice state
 */
interface UserState {
    isLoggedIn: boolean;
    userId: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: UserState = {
    isLoggedIn: false,
    userId: null,
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


// @ts-ignore
const userSlice = createSlice<UserState, {}, 'user'>({
    name: 'user',
    initialState,
    reducers: {
        // Add synchronous reducers here if needed
    },
    extraReducers: (builder) => {
        builder
            // Handle all pending actions
            .addMatcher(
                (action: UnknownAction): action is ReturnType<typeof login.pending | typeof register_acc.pending | typeof logout.pending | typeof reset.pending> =>
                    action.type.endsWith('/pending'),
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )

            // Handle all rejected actions
            .addMatcher(
                (action: UnknownAction): action is ReturnType<typeof login.rejected | typeof register_acc.rejected | typeof logout.rejected | typeof reset.rejected> =>
                    action.type.endsWith('/rejected'),
                (state, action) => {
                    state.loading = false;

                    // Note: because the type of the action could be different, I need to simply
                    // parse it as a json string and back to json to get the field out

                    const actionmessage  = JSON.parse(JSON.stringify(action, null, 2)).payload;
                    state.error = actionmessage || 'An error occurred';
                }
            )

            // Handle fulfilled actions for login and register_acc
            .addMatcher(
                isAnyOf(login.fulfilled, register_acc.fulfilled),
                (state, action: PayloadAction<AuthResponse>) => {
                    state.loading = false;
                    state.isLoggedIn = true;
                    state.userId = action.payload.userId;
                }
            )

            // Handle fulfilled actions for logout and reset
            .addMatcher(
                isAnyOf(logout.fulfilled, reset.fulfilled),
                (state) => {
                    state.loading = false;
                    state.isLoggedIn = false;
                    state.userId = null;
                }
            )

            .addMatcher(
                (action: {type: string}): action is {type: 'user/errorReset'} => action.type === 'user/errorReset',
                (state) => {
                    state.error = null;
                }
            );
    },
});


export default userSlice.reducer;
