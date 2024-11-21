// src/features/parkingSpace/parkingSpaceSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "@/api/axiosInstance"
import { ParkingSpace } from "@/types/type"

interface ParkingSpaceState {
  loading: boolean
  error: string | null
  parkingSpace: ParkingSpace | null
  userRating: {
    availabilityRating: number | null
    cleanlinessRating: number | null
  } | null
  lockStatus: "idle" | "locking" | "locked" | "unlocking" | "failed"
  lockExpiresAt: number | null
  pointsAwarded: boolean
}

const initialState: ParkingSpaceState = {
  loading: false,
  error: null,
  parkingSpace: null,
  userRating: null,
  lockStatus: "idle",
  lockExpiresAt: null,
  pointsAwarded: false,
}

interface RatingPayload {
  parkingSpaceId: string
  availabilityRating?: number
  cleanlinessRating?: number
}

export const resetParkingSpaceState = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("parkingSpace/resetParkingSpaceState", async (_, { dispatch }) => {
  dispatch(resetParkingSpace())
})

export const getAllPendingSpots = createAsyncThunk<
  { pendingSpaces: ParkingSpace[] },
  void,
  { rejectValue: string }
>("owner/getAllPendingSpots", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/parking-spaces/get-pending")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to get pending parking spots",
    )
  }
})

/**
 * Fetch Parking Space Details
 * GET /parking-spaces/{id}
 */
export const fetchParkingSpace = createAsyncThunk<
  ParkingSpace,
  string,
  { rejectValue: string }
>(
  "parkingSpace/fetchParkingSpace",
  async (parkingSpaceId, { rejectWithValue }) => {
    try {
      const response = await axios.get<ParkingSpace>(
        `/parking-spaces/${parkingSpaceId}`,
      )
      return response.data
    } catch (error: any) {
      if (error.response?.status === 401) {
        return rejectWithValue("Unauthorized")
      }
      if (error.response?.status === 403) {
        return rejectWithValue("Forbidden")
      }
      if (error.response?.status === 404) {
        return rejectWithValue("Not found")
      }
      return rejectWithValue("Failed to fetch parking space")
    }
  },
)

/**
 * Lock a Parking Space
 * POST /reservations/lock
 */
export const lockParkingSpace = createAsyncThunk<
  { expiresAt: number },
  { parking_space_id: string; lock_duration: string },
  { rejectValue: string }
>(
  "parkingSpace/lockParkingSpace",
  async ({ parking_space_id, lock_duration }, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ expiresAt: number }>(
        "/reservations/lock",
        {
          parking_space_id,
          lock_duration,
        },
      )
      return response.data
    } catch (error: any) {
      if (error.response?.status === 400) {
        return rejectWithValue("Invalid input data")
      }
      if (error.response?.status === 401) {
        return rejectWithValue("Unauthorized")
      }
      if (error.response?.status === 403) {
        return rejectWithValue("Forbidden")
      }
      if (error.response?.status === 409) {
        return rejectWithValue("Parking space is already locked or reserved")
      }
      return rejectWithValue("Failed to lock parking space")
    }
  },
)

/**
 * Unlock a Parking Space
 * POST /reservations/unlock
 */
export const unlockParkingSpace = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>(
  "parkingSpace/unlockParkingSpace",
  async (parkingSpaceId, { rejectWithValue }) => {
    try {
      await axios.post("/reservations/unlock", {
        parking_space_id: parkingSpaceId,
      })
    } catch (error: any) {
      if (error.response?.status === 400) {
        return rejectWithValue("Invalid input data")
      }
      if (error.response?.status === 401) {
        return rejectWithValue("Unauthorized")
      }
      if (error.response?.status === 403) {
        return rejectWithValue("Forbidden")
      }
      if (error.response?.status === 404) {
        return rejectWithValue("Parking space not locked by user")
      }
      return rejectWithValue("Failed to unlock parking space")
    }
  },
)

/**
 * Update the status of a parking spot
 * PUT /parking-spaces/update
 */
export const markSpotTaken = createAsyncThunk<
  void,
  { parkingSpaceId: string; formData: FormData },
  { rejectValue: string }
>(
  "parkingSpace/markSpotTaken",
  async ({ parkingSpaceId, formData }, { rejectWithValue }) => {
    try {
      await axios.post(`/parking-spaces/${parkingSpaceId}/taken`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update spot status",
      )
    }
  },
)

export const submitRating = createAsyncThunk<
  void,
  RatingPayload,
  { rejectValue: string }
>(
  "parkingSpace/submitRating",
  async (
    { parkingSpaceId, availabilityRating, cleanlinessRating },
    { rejectWithValue },
  ) => {
    try {
      await axios.post(`/parking-spaces/${parkingSpaceId}/rate`, {
        availability_rating: availabilityRating,
        cleanliness_rating: cleanlinessRating,
      })
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit rating",
      )
    }
  },
)

export const fetchUserRating = createAsyncThunk<
  { availability_rating: number | null; cleanliness_rating: number | null },
  string,
  { rejectValue: string }
>(
  "parkingSpace/fetchUserRating",
  async (parkingSpaceId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `/parking-spaces/${parkingSpaceId}/user-rating`,
      )
      return response.data
    } catch (error: any) {
      return rejectWithValue("Failed to fetch user rating")
    }
  },
)

export const awardPoints = createAsyncThunk<
  void,
  { parkingSpaceId: string; formData: FormData },
  { rejectValue: string }
>(
  "parkingSpace/awardPoints",
  async ({ parkingSpaceId, formData }, { rejectWithValue }) => {
    try {
      await axios.post(
        `/parking-spaces/${parkingSpaceId}/award-points`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      )
    } catch (error: any) {
      console.error("Error response:", error.response) // Log the full error response
      console.error("Error data:", error.response?.data) // Log the error data if available

      const errorMessage = error.response?.data?.err || "Failed to award points" // Check for backend 'err' message
      return rejectWithValue(errorMessage)
    }
  },
)

/**
 * **Parking Space Slice**
 */
const parkingSpaceSlice = createSlice({
  name: "parkingSpace",
  initialState,
  reducers: {
    /**
     * Reset error state
     */
    resetError(state) {
      state.error = null
    },
    /**
     * Reset parking space state
     */
    resetParkingSpace(state) {
      state.parkingSpace = null
      state.userRating = null
      state.lockStatus = "idle"
      state.lockExpiresAt = null
      state.error = null
      state.loading = false
      state.pointsAwarded = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(awardPoints.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(awardPoints.fulfilled, (state) => {
        state.loading = false
        state.pointsAwarded = true
      })
      .addCase(awardPoints.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Failed to award points"
      })

    builder
      .addCase(markSpotTaken.pending, (state: ParkingSpaceState) => {
        state.loading = true
        state.error = null
      })
      .addCase(markSpotTaken.fulfilled, (state: ParkingSpaceState) => {
        state.loading = false
      })
      .addCase(markSpotTaken.rejected, (state: ParkingSpaceState, action) => {
        state.loading = false
        state.error = action.payload || "Failed to update spot status"
      })

    /**
     * Handle fetchParkingSpace actions
     */
    builder
      .addCase(fetchParkingSpace.pending, (state: ParkingSpaceState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        fetchParkingSpace.fulfilled,
        (state: ParkingSpaceState, action) => {
          state.loading = false
          state.parkingSpace = action.payload
        },
      )
      .addCase(
        fetchParkingSpace.rejected,
        (state: ParkingSpaceState, action) => {
          state.loading = false
          state.error = action.payload || "Failed to fetch parking space"
        },
      )

    /**
     * Handle lockParkingSpace actions
     */
    builder
      .addCase(lockParkingSpace.pending, (state: ParkingSpaceState) => {
        state.lockStatus = "locking"
        state.error = null
      })
      .addCase(
        lockParkingSpace.fulfilled,
        (state: ParkingSpaceState, action) => {
          state.lockStatus = "locked"
          state.lockExpiresAt = action.payload.expiresAt
        },
      )
      .addCase(
        lockParkingSpace.rejected,
        (state: ParkingSpaceState, action) => {
          state.lockStatus = "failed"
          state.error = action.payload || "Failed to lock parking space"
        },
      )

    /**
     * Handle unlockParkingSpace actions
     */
    builder
      .addCase(unlockParkingSpace.pending, (state: ParkingSpaceState) => {
        state.lockStatus = "unlocking"
        state.error = null
      })
      .addCase(unlockParkingSpace.fulfilled, (state: ParkingSpaceState) => {
        state.lockStatus = "idle"
        state.lockExpiresAt = null
      })
      .addCase(
        unlockParkingSpace.rejected,
        (state: ParkingSpaceState, action) => {
          state.lockStatus = "failed"
          state.error = action.payload || "Failed to unlock parking space"
        },
      )

    builder
      .addCase(fetchUserRating.pending, (state: ParkingSpaceState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        fetchUserRating.fulfilled,
        (state: ParkingSpaceState, action: any) => {
          state.loading = false
          state.userRating = {
            availabilityRating: action.payload.availability_rating,
            cleanlinessRating: action.payload.cleanliness_rating,
          }
        },
      )
      .addCase(
        fetchUserRating.rejected,
        (state: ParkingSpaceState, action: any) => {
          state.loading = false
          state.error = action.payload || "Failed to fetch user rating"
        },
      )

    builder.addCase(
      submitRating.fulfilled,
      (state: ParkingSpaceState, action: any) => {
        state.loading = false
        // Update the local user rating state when a new rating is submitted
        if (state.userRating) {
          state.userRating = {
            ...state.userRating,
            availabilityRating:
              action.meta.arg.availabilityRating ??
              state.userRating.availabilityRating,
            cleanlinessRating:
              action.meta.arg.cleanlinessRating ??
              state.userRating.cleanlinessRating,
          }
        }
      },
    )

    builder.addCase(
      resetParkingSpaceState.fulfilled,
      (state: ParkingSpaceState) => {
        state.parkingSpace = null
        state.userRating = null
        state.lockStatus = "idle"
        state.lockExpiresAt = null
        state.error = null
        state.loading = false
        state.pointsAwarded = false
      },
    )
  },
})

/**
 * **Export Actions and Reducer**
 */
export const { resetError, resetParkingSpace } = parkingSpaceSlice.actions

export default parkingSpaceSlice.reducer
