// src/features/user/userSlice.ts

import {
  createSlice,
  createAsyncThunk,
  UnknownAction,
  PayloadAction,
  isAnyOf,
} from "@reduxjs/toolkit"
import axios from "../../api/axiosInstance" // Ensure the path is correct
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  PasswordResetRequest,
  UserUpdateRequest,
} from "@/types/type"
import { act } from "react"

/**
 * Interface for the user slice state
 */
interface UserState {
  isLoggedIn: boolean
  access_token: string | null
  name: string | null
  location: {
    latitude: number | null
    longitude: number | null
  }
  loading: boolean
  error: string | null
  notificationTime: string | null
  userCity: string | null
  userState: string | null
  total_points: number | null
  current_points: number | null
  badges: number[]
  transactions: any[]
  active_raffle_tickets: number
  score: number
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
  userCity: null,
  userState: null,
  total_points: 0,
  current_points: 0,
  badges: [],
  transactions: [],
  active_raffle_tickets: 0,
  score: 5,
}

/**
 * Define the login thunk
 */
export const login = createAsyncThunk<
  AuthResponse, // Return type
  LoginRequest, // Argument type
  { rejectValue: string } // ThunkAPI config
>("user/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await axios.post<AuthResponse>("auth/login", credentials)
    return response.data
  } catch (error: any) {
    if (error.status === 401) {
      return rejectWithValue("Invalid email or password")
    }
    return rejectWithValue("Login failed")
  }
})

export const deleteAccount = createAsyncThunk<
  void, // Return type of the payload creator
  string, // Token passed in the URL
  { rejectValue: string } // Types for ThunkAPI
>("user/deleteAccount", async (token: string, { rejectWithValue }) => {
  try {
    // Send request to delete account, no body needed, just the token
    const response = await axios.get(`/auth/confirm-delete/${token}`)
    return response.data
  } catch (error: any) {
    return rejectWithValue("Deletion Token Invalid")
  }
})

// Thunk for updating spot status
export const updateSpot = createAsyncThunk(
  "user/updateSpot",
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/api/spot/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return response.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update spot status",
      )
    }
  },
)

export const request_delete_account = createAsyncThunk<
  void, // Return type of the payload creator
  { password: string }, // First argument to the payload creator
  { rejectValue: string } // Types for ThunkAPI
>("user/request_delete_account", async ({ password }, { rejectWithValue }) => {
  try {
    // Implement logout logic if needed (e.g., API call to invalidate token)
    const response = await axios.post("auth/request_delete_account", {
      password,
    })
    return response.data
  } catch (error: any) {
    if (error.response?.status === 401) {
      return rejectWithValue("Invalid password")
    }
    return rejectWithValue("Account deletion request failed")
  }
})

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
      credentials,
    )
    return response.data
  } catch (error: any) {
    return rejectWithValue("Registration failed")
  }
})

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
    await axios.post("auth/logout")
    return
  } catch (error: any) {
    return rejectWithValue("Logout failed")
  }
})

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
      })
      return response.data
    } catch (error: any) {
      if (error.response?.status === 400) {
        return rejectWithValue("Invalid token or password")
      }
      return rejectWithValue("Password reset failed")
    }
  },
)

export const reset_request = createAsyncThunk<
  void, // Return type of the payload creator
  string, // First argument to the payload creator (email)
  { rejectValue: string } // Types for ThunkAPI
>("user/reset_request", async (email: string, { rejectWithValue }) => {
  try {
    const response = await axios.post("auth/password-reset", {
      email,
    } as PasswordResetRequest)
    return response.data
  } catch (error: any) {
    if (error.status === 404) {
      return rejectWithValue("Email not found")
    }
    return rejectWithValue("Password reset failed")
  }
})

export const get_user_name = createAsyncThunk<
  string | null,
  void,
  { rejectValue: string }
>("user/get_user_name", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/user-name")
    return response.data.name
  } catch (error: any) {
    console.log("error", error)
    return rejectWithValue(
      error.response?.data?.err || "Failed to get user name",
    )
  }
})

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
      })
      return response.data
    } catch (error: any) {
      return rejectWithValue("Failed to update notification time")
    }
  },
)

export const get_notification_time = createAsyncThunk<
  string | null,
  void,
  { rejectValue: string }
>("user/get_notification_time", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/notification-time")
    return response.data.time
  } catch (error: any) {
    return rejectWithValue("Failed to get notification time")
  }
})

export const set_user_location = createAsyncThunk<
  void,
  { state: string; city: string },
  { rejectValue: string }
>("user/set_user_location", async ({ state, city }, { rejectWithValue }) => {
  try {
    const response = await axios.post("auth/user-location", { state, city })
    return response.data
  } catch (error: any) {
    return rejectWithValue("Failed to set user location")
  }
})

export const get_user_location = createAsyncThunk<
  { state: string; city: string } | null,
  void,
  { rejectValue: string }
>("user/get_user_location", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/user-location")
    return response.data
  } catch (error: any) {
    return rejectWithValue("Failed to get user location")
  }
})

export const get_points = createAsyncThunk<
  { total: number; current: number } | null,
  void,
  { rejectValue: string }
>("user/get_points", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/points")
    console.log("data", response.data)
    return response.data.points
  } catch (error: any) {
    return rejectWithValue("Failed to get points")
  }
})

export const get_transactions = createAsyncThunk<
  any[],
  void,
  { rejectValue: string }
>("user/get_transactions", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/transaction-history")
    return response.data.transactions
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.err || "Failed to get transactions",
    )
  }
})

export const buy_badge = createAsyncThunk<
  null,
  { badgeId: number },
  { rejectValue: string }
>("user/buy_badge", async ({ badgeId }, { rejectWithValue }) => {
  try {
    const response = await axios.post("auth/shop/buy-badge", { badgeId })
    return response.data
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.err || "Failed to buy badge")
  }
})

export const get_badge_list = createAsyncThunk<
  number[],
  void,
  { rejectValue: string }
>("user/get_badge_list", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/badge-list")
    return response.data.badges
  } catch (error: any) {
    return rejectWithValue("Failed to get badge list")
  }
})

export const buy_raffle_ticket = createAsyncThunk<
  null,
  { raffleId: number },
  { rejectValue: string }
>("user/buy_raffle_ticket", async ({ raffleId }, { rejectWithValue }) => {
  try {
    const response = await axios.post("auth/shop/buy-raffle", { raffleId })
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.err || "Failed to buy raffle ticket",
    )
  }
})

export const get_raffle_tickets = createAsyncThunk<
  number,
  void,
  { rejectValue: string }
>("user/get_raffle_tickets", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/raffle-tickets")
    return response.data.tickets.count
  } catch (error: any) {
    return rejectWithValue("Failed to get raffle tickets")
  }
})

export const get_score = createAsyncThunk<
  { score: number } | null,
  void,
  { rejectValue: string }
>("user/get_score", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("auth/score")
    console.log("data", response.data)
    return response.data.score
  } catch (error: any) {
    return rejectWithValue("Failed to get score")
  }
})

// @ts-ignore
const userSlice = createSlice<UserState, {}, "user">({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (
          action: UnknownAction,
        ): action is ReturnType<
          | typeof login.pending
          | typeof register_acc.pending
          | typeof logout.pending
          | typeof reset_password.pending
          | typeof get_user_name.pending
          | typeof update_notification_time.pending
          | typeof get_points.pending
          | typeof get_transactions.pending
          | typeof buy_badge.pending
          | typeof get_badge_list.pending
          | typeof buy_raffle_ticket.pending
          | typeof get_raffle_tickets.pending
          | typeof get_score.pending
        > => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true
          state.error = null
        },
      )

      // Handle all rejected actions
      .addMatcher(
        (
          action: UnknownAction,
        ): action is ReturnType<
          | typeof login.rejected
          | typeof register_acc.rejected
          | typeof logout.rejected
          | typeof reset_password.rejected
          | typeof get_user_name.rejected
          | typeof get_points.rejected
          | typeof get_transactions.rejected
          | typeof buy_badge.rejected
          | typeof get_badge_list.rejected
          | typeof buy_raffle_ticket.rejected
          | typeof get_raffle_tickets.rejected
          | typeof get_score.rejected
        > => action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false

          // Note: because the type of the action could be different, I need to simply
          // parse it as a json string and back to json to get the field out

          const actionmessage = JSON.parse(
            JSON.stringify(action, null, 2),
          ).payload
          state.error = actionmessage || "An error occurred"
          state.loading = false
        },
      )

      // Handle fulfilled actions for login and register_acc
      .addMatcher(
        isAnyOf(login.fulfilled, register_acc.fulfilled),
        (state, action: PayloadAction<AuthResponse>) => {
          state.loading = false
          state.isLoggedIn = true
          state.access_token = action.payload.access_token || null
          state.name = action.payload.name || null
        },
      )

      // Handle fulfilled actions for logout and reset
      .addMatcher(
        isAnyOf(logout.fulfilled, reset_password.fulfilled),
        (state) => {
          state.loading = false
          state.isLoggedIn = false
          state.access_token = null
        },
      )

      .addMatcher(
        (action: { type: string }): action is { type: "user/errorReset" } =>
          action.type === "user/errorReset",
        (state) => {
          state.error = null
          state.loading = false
        },
      )
      .addMatcher(
        (action: { type: string }): action is { type: "user/errorReset" } =>
          action.type === "user/errorReset",
        (state) => {
          state.error = null
          state.loading = false
          state.access_token = null
          state.isLoggedIn = false
          state.name = null
        },
      )

      .addMatcher(
        (action: { type: string }): action is { type: "user/resetLoggedIn" } =>
          action.type === "user/resetLoggedIn",
        (state) => {
          state.error = null
          state.loading = false
          state.access_token = null
          state.isLoggedIn = false
          state.name = null
        },
      )

      .addMatcher(isAnyOf(get_user_name.fulfilled), (state, action) => {
        state.loading = false
        state.name = action.payload
      })

      .addMatcher(
        isAnyOf(update_notification_time.fulfilled),
        (state, action) => {
          state.loading = false
          state.notificationTime = action.meta.arg.notificationTime
        },
      )

      .addMatcher(isAnyOf(get_notification_time.fulfilled), (state, action) => {
        state.loading = false
        state.notificationTime = action.payload
      })

      .addMatcher(isAnyOf(set_user_location.fulfilled), (state, action) => {
        state.loading = false
        state.userState = action.meta.arg.state
        state.userCity = action.meta.arg.city
      })

      .addMatcher(isAnyOf(get_points.fulfilled), (state, action) => {
        state.loading = false
        //@ts-ignore
        state.total_points = action.payload?.total
        //@ts-ignore
        state.current_points = action.payload?.current
      })

      .addMatcher(isAnyOf(get_transactions.fulfilled), (state, action) => {
        state.loading = false
        state.transactions = action.payload
      })

      .addMatcher(isAnyOf(buy_badge.fulfilled), (state, action) => {
        state.loading = false
        if (!state.badges) {
          state.badges = []
        }
        state.badges.push(Number(action.meta.arg.badgeId))
      })

      .addMatcher(isAnyOf(get_badge_list.fulfilled), (state, action) => {
        state.loading = false
        state.badges = action.payload
      })

      .addMatcher(isAnyOf(buy_raffle_ticket.fulfilled), (state, action) => {
        state.loading = false
      })

      .addMatcher(isAnyOf(get_raffle_tickets.fulfilled), (state, action) => {
        state.loading = false
        console.log("action.payload", action.payload)
        state.active_raffle_tickets = action.payload
      })
        
      .addMatcher(isAnyOf(get_score.fulfilled), (state, action) => {
        state.loading = false
        console.log(`score! ${action.payload}`)
        //@ts-ignore
        state.score = action.payload
      })
  },
})

export default userSlice.reducer
