// src/features/user/userSlice.ts

import {
  createSlice,
  createAsyncThunk,
  UnknownAction,
  PayloadAction,
  isAnyOf,
} from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance"; // Ensure the path is correct
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  PasswordResetRequest,
  UserUpdateRequest,
} from "@/types/type";

/**
 * Interface for the user slice state
 */
interface UserState {
  isLoggedIn: boolean;
  access_token: string | null;
  name: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  loading: boolean;
  error: string | null;
  notificationTime: string | null;
}

const initialState: UserState = {
  isLoggedIn: false, // Maybe redundant, just check if access_token is null
  access_token: null,
  name: null,
  location: {
    latitude: null,
    longitude: null,
  },
  loading: false,
  error: null,
  notificationTime: null,
};

/**
 * Define the login thunk
 */
export const login = createAsyncThunk<
  AuthResponse, // Return type
  LoginRequest, // Argument type
  { rejectValue: string } // ThunkAPI config
>("user/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post<AuthResponse>("auth/login", credentials);
    return response.data;
  } catch (error: any) {
    if (error.status === 401) {
      return rejectWithValue("Invalid email or password");
    }
    return rejectWithValue("Login failed");
  }
});

export const deleteAccount = createAsyncThunk<
  void, // Return type of the payload creator
  string, // Token passed in the URL
  { rejectValue: string } // Types for ThunkAPI
>("user/deleteAccount", async (token: string, { rejectWithValue }) => {
  try {
    // Send request to delete account, no body needed, just the token
    const response = await axios.get(`/auth/confirm-delete/${token}`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue("Deletion Token Invalid");
  }
});

// Thunk for updating spot status
export const updateSpot = createAsyncThunk(
  "user/updateSpot",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/api/spot/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update spot status"
      );
    }
  }
);

export const request_delete_account = createAsyncThunk<
  void, // Return type of the payload creator
  { password: string }, // First argument to the payload creator
  { rejectValue: string } // Types for ThunkAPI
>("user/request_delete_account", async ({ password }, { rejectWithValue }) => {
  try {
    // Implement logout logic if needed (e.g., API call to invalidate token)
    const response = await axios.post("auth/request_delete_account", {
      password,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return rejectWithValue("Invalid password");
    }
    return rejectWithValue("Account deletion request failed");
  }
});

/**
 * Define the register thunk
 */
export const register_acc = createAsyncThunk<
  AuthResponse, // Return type of the payload creator
  RegisterRequest, // First argument to the payload creator
  { rejectValue: string } // Types for ThunkAPI
>("user/register", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post<AuthResponse>(
      "auth/register",
      credentials
    );
    return response.data;
  } catch (error: any) {
    return rejectWithValue("Registration failed");
  }
});

/**
 * Define the logout thunk
 */
export const logout = createAsyncThunk<
  void, // Return type of the payload creator
  void, // First argument to the payload creator
  { rejectValue: string } // Types for ThunkAPI
>("user/logout", async (_, { rejectWithValue }) => {
  try {
    // Implement logout logic if needed (e.g., API call to invalidate token)
    await axios.post("auth/logout");
    return;
  } catch (error: any) {
    return rejectWithValue("Logout failed");
  }
});

export const reset_password = createAsyncThunk<
  void,
  { token: string; newPassword: string },
  { rejectValue: string }
>(
  "user/reset_password",
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`auth/reset-password/${token}`, {
        new_password: newPassword, // Match the backend's expected field name
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        return rejectWithValue("Invalid token or password");
      }
      return rejectWithValue("Password reset failed");
    }
  }
);

export const reset_request = createAsyncThunk<
  void, // Return type of the payload creator
  string, // First argument to the payload creator (email)
  { rejectValue: string } // Types for ThunkAPI
>("user/reset_request", async (email: string, { rejectWithValue }) => {
  try {
    const response = await axios.post("auth/password-reset", {
      email,
    } as PasswordResetRequest);
    return response.data;
  } catch (error: any) {
    if (error.status === 404) {
      return rejectWithValue("Email not found");
    }
    return rejectWithValue("Password reset failed");
  }
});

export const update_notification_time = createAsyncThunk<
  User,
  { notificationTime: string },
  { rejectValue: string }
>(
  "user/update_notification_time",
  async ({ notificationTime }, { rejectWithValue }) => {
    try {
      const response = await axios.post("auth/notification-time", {
        time: notificationTime,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue("Failed to update notification time");
    }
  }
);

export const get_notification_time = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("user/get_notification_time", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/notification-time");
    return response.data.time;
  } catch (error: any) {
    return rejectWithValue("Failed to get notification time");
  }
});

// @ts-ignore
const userSlice = createSlice<UserState, {}, "user">({
  name: "user",
  initialState,
  reducers: {
    // Add synchronous reducers here if needed
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (
          action: UnknownAction
        ): action is ReturnType<
          | typeof login.pending
          | typeof register_acc.pending
          | typeof logout.pending
          | typeof reset_password.pending
          | typeof update_notification_time.pending
        > => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )

      // Handle all rejected actions
      .addMatcher(
        (
          action: UnknownAction
        ): action is ReturnType<
          | typeof login.rejected
          | typeof register_acc.rejected
          | typeof logout.rejected
          | typeof reset_password.rejected
          | typeof update_notification_time.rejected
        > => action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;

          // Note: because the type of the action could be different, I need to simply
          // parse it as a json string and back to json to get the field out

          const actionmessage = JSON.parse(
            JSON.stringify(action, null, 2)
          ).payload;
          state.error = actionmessage || "An error occurred";
          state.loading = false;
        }
      )

      // Handle fulfilled actions for login and register_acc
      .addMatcher(
        isAnyOf(login.fulfilled, register_acc.fulfilled),
        (state, action: PayloadAction<AuthResponse>) => {
          state.loading = false;
          state.isLoggedIn = true;
          state.access_token = action.payload.access_token || null;
          state.name = action.payload.name || null;
        }
      )

      // Handle fulfilled actions for logout and reset
      .addMatcher(
        isAnyOf(logout.fulfilled, reset_password.fulfilled),
        (state) => {
          state.loading = false;
          state.isLoggedIn = false;
          state.access_token = null;
        }
      )

      .addMatcher(
        (action: { type: string }): action is { type: "user/errorReset" } =>
          action.type === "user/errorReset",
        (state) => {
          state.error = null;
          state.loading = false;
        }
      )

      .addMatcher(
        isAnyOf(update_notification_time.fulfilled),
        (state, action) => {
          state.loading = false;
          state.notificationTime = action.meta.arg.notificationTime;
        }
      );
  },
});

export default userSlice.reducer;
