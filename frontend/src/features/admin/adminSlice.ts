import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "@/api/axiosInstance"
import { ParkingSpace } from "@/types/type"

interface Conflict {
  id: string
  reservation_id: string
  description: string
  type: "Other" | "Technical" | "Billing"
  status: "open" | "in_progress" | "resolved"
  admin_response: string | null
  created_at: string
  updated_at: string
  owner_name: string
  parking_space_name: string
  parking_space_address: string
  start_time: string
  end_time: string
  owner_id: string
  reporter_id: string
  reporter_name: string
}
interface UserDetails {
  id: string
  name: string
  email: string
  pastBookings: any[]
  parkingSpaces: any[]
  reports: any[]
}

interface RaffleEntry {
  user_id: string
  username: string
  email: string
  tickets: number
}

interface AdminState {
  pendingSpots: ParkingSpace[]
  conflicts: Conflict[]
  cancellations: Conflict[]
  raffleEntries: RaffleEntry[]
  raffleResult: RaffleEntry[]
  userDetails: UserDetails | null
  loading: boolean
  error: string | null
}

const initialState: AdminState = {
  pendingSpots: [],
  conflicts: [],
  cancellations: [],
  raffleEntries: [],
  raffleResult: [],
  userDetails: null,
  loading: false,
  error: null,
}

// Async thunk to fetch user details
export const fetchUserDetails = createAsyncThunk<
  UserDetails,
  string,
  { rejectValue: string }
>("admin/fetchUserDetails", async (userId, { rejectWithValue }) => {
  try {
    const response = await axios.get(`/admin/user-details/${userId}`)
    return response.data
  } catch (error: any) {
    console.error("Error fetching user details:", error)
    return rejectWithValue(
      error.response?.data?.error || "Failed to fetch user details",
    )
  }
})

// Ban user
export const banUser = createAsyncThunk<
  void, // No return value needed
  { userId: string; rationale: string }, // Arguments passed to the thunk
  { rejectValue: string }
>("ban/banUser", async ({ userId, rationale }, { rejectWithValue }) => {
  try {
    await axios.post(`/admin/ban-user`, { userId, rationale })
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || "Failed to ban user")
  }
})

// Async thunk to update a conflict response
export const updateConflictResponse = createAsyncThunk<
  Conflict,
  { id: string; response: string },
  { rejectValue: string }
>(
  "admin/updateConflictResponse",
  async ({ id, response }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`/admin/update-conflict`, { id, response })
      return res.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update conflict response",
      )
    }
  },
)

// Async thunk to fetch all conflicts
export const getAllConflicts = createAsyncThunk<
  { conflicts: Conflict[] },
  void,
  { rejectValue: string }
>("admin/getAllConflicts", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/admin/get-conflicts")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to get conflicts",
    )
  }
})

// Async thunk to fetch all cancellations
export const getCancelled = createAsyncThunk<
  { cancellations: Conflict[] },
  void,
  { rejectValue: string }
>("admin/getCancelled", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/admin/get-cancellations")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to get cancellations",
    )
  }
})

// Async thunk to acknowledge a cancellation
export const acknowledgeCancelled = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("admin/acknowledgeCancelled", async (id, { rejectWithValue }) => {
  try {
    await axios.post(`/admin/acknowledge-cancellation`, { id })
    return id
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to acknowledge cancellation",
    )
  }
})

// Async thunk to fetch all pending parking spots
export const getAllPendingSpots = createAsyncThunk<
  { pendingSpaces: ParkingSpace[] },
  void,
  { rejectValue: string }
>("admin/getAllPendingSpots", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/admin/get-pending")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to get pending parking spots",
    )
  }
})

// Async thunk to verify or reject a parking spot
export const verifyParkingSpot = createAsyncThunk<
  ParkingSpace,
  { spotId: string; is_verified: boolean },
  { rejectValue: string }
>("admin/verifySpot", async ({ spotId, is_verified }, { rejectWithValue }) => {
  try {
    const response = await axios.post(`/admin/verify-parking-space`, {
      spotId,
      is_verified,
    })
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to verify parking spot",
    )
  }
})

// Async thunk to delete a parking space
export const deleteParkingSpace = createAsyncThunk<
  string,
  any,
  { rejectValue: string }
>(
  "admin/deleteParkingSpace",
  async ({ parkingSpaceId, reason }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `/admin/parking-spaces/${parkingSpaceId}`,
        {
          data: { reason },
        },
      )

      if (response.status === 200) {
        return parkingSpaceId
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.err || "Failed to delete parking space"

      // Handle specific error cases
      if (error.response?.status === 403) {
        if (error.response?.data?.err === "Not allowed to delete paid spot") {
          return rejectWithValue("Cannot delete a paid parking spot")
        }
        return rejectWithValue("Not authorized to delete this parking spot")
      }

      if (error.response?.status === 404) {
        return rejectWithValue("Parking spot not found")
      }

      return rejectWithValue(errorMessage)
    }
  },
)

// Async thunk to fetch raffle entries
export const getRaffleEntries = createAsyncThunk<
  { raffleEntries: RaffleEntry[] },
  void,
  { rejectValue: string }
>("admin/getRaffleEntries", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/admin/get-raffle-entries")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to get raffle entries",
    )
  }
})

// Async thunk to perform raffle
export const performRaffle = createAsyncThunk<
  { raffleResult: RaffleEntry[] },
  void,
  { rejectValue: string }
>("admin/performRaffle", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.post("/admin/perform-raffle")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to perform raffle",
    )
  }
})

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(verifyParkingSpot.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        verifyParkingSpot.fulfilled,
        (state: AdminState, action: any) => {
          state.loading = false
          const updatedSpot = action.payload
          state.pendingSpots = state.pendingSpots.map((spot) =>
            spot.id === updatedSpot.id ? updatedSpot : spot,
          )
        },
      )
      .addCase(verifyParkingSpot.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(deleteParkingSpace.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteParkingSpace.fulfilled, (state: AdminState, action) => {
        state.loading = false
      })
      .addCase(deleteParkingSpace.rejected, (state: AdminState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch user details
      .addCase(fetchUserDetails.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUserDetails.fulfilled, (state: AdminState, action: any) => {
        state.loading = false
        state.userDetails = action.payload // Assign API response directly
      })
      .addCase(fetchUserDetails.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Ban user
      .addCase(banUser.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(banUser.fulfilled, (state: AdminState) => {
        state.loading = false
      })
      .addCase(banUser.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Handle updateConflictResponse
      .addCase(updateConflictResponse.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        updateConflictResponse.fulfilled,
        (state: AdminState, action: any) => {
          state.loading = false
          state.conflicts = state.conflicts.map((conflict) =>
            conflict.id === action.payload.id
              ? { ...conflict, admin_response: action.payload.admin_response }
              : conflict,
          )
        },
      )
      .addCase(
        updateConflictResponse.rejected,
        (state: AdminState, action: any) => {
          state.loading = false
          state.error = action.payload as string
        },
      )
      // Handle getAllConflicts
      .addCase(getAllConflicts.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(getAllConflicts.fulfilled, (state: AdminState, action: any) => {
        state.loading = false
        state.conflicts = action.payload.conflicts
      })
      .addCase(getAllConflicts.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle getCancelled
      .addCase(getCancelled.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(getCancelled.fulfilled, (state: AdminState, action: any) => {
        state.loading = false
        state.cancellations = action.payload.cancellations
      })
      .addCase(getCancelled.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle acknowledgeCancelled
      .addCase(acknowledgeCancelled.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        acknowledgeCancelled.fulfilled,
        (state: AdminState, action: any) => {
          state.loading = false
          state.cancellations = state.cancellations.filter(
            (cancellation) => cancellation.id !== action.payload,
          )
        },
      )
      .addCase(
        acknowledgeCancelled.rejected,
        (state: AdminState, action: any) => {
          state.loading = false
          state.error = action.payload as string
        },
      )
      // Handle getAllPendingSpots
      .addCase(getAllPendingSpots.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        getAllPendingSpots.fulfilled,
        (state: AdminState, action: any) => {
          state.loading = false
          state.pendingSpots = action.payload.pendingSpaces
        },
      )
      .addCase(
        getAllPendingSpots.rejected,
        (state: AdminState, action: any) => {
          state.loading = false
          state.error = action.payload as string
        },
      )
      // Handle verifyParkingSpot
      .addCase(verifyParkingSpot.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        verifyParkingSpot.fulfilled,
        (state: AdminState, action: any) => {
          state.loading = false
          const updatedSpot = action.payload
          state.pendingSpots = state.pendingSpots.map((spot) =>
            spot.id === updatedSpot.id ? updatedSpot : spot,
          )
        },
      )
      .addCase(verifyParkingSpot.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle deleteParkingSpace
      .addCase(deleteParkingSpace.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteParkingSpace.fulfilled, (state: AdminState, action) => {
        state.loading = false
      })
      .addCase(deleteParkingSpace.rejected, (state: AdminState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle getRaffleEntries
      .addCase(getRaffleEntries.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(getRaffleEntries.fulfilled, (state: AdminState, action: any) => {
        state.loading = false
        state.raffleEntries = action.payload
      })
      .addCase(getRaffleEntries.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle performRaffle
      .addCase(performRaffle.pending, (state: AdminState) => {
        state.loading = true
        state.error = null
      })
      .addCase(performRaffle.fulfilled, (state: AdminState, action: any) => {
        state.loading = false
        state.raffleResult = action.payload
      })
      .addCase(performRaffle.rejected, (state: AdminState, action: any) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export default adminSlice.reducer
