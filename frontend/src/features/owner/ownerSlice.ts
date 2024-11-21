import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "../../api/axiosInstance"
import { ParkingSpace } from "@/types/type"
import { logger } from "bs-logger"

interface OwnerSpotsResponse {
  spaces: ParkingSpace[]
}

interface OwnerState {
  loading: boolean
  error: string | null
  freeSpots: ParkingSpace[]
  paidSpots: ParkingSpace[]
  pendingSpots: ParkingSpace[]
}

const initialState: OwnerState = {
  loading: false,
  error: null,
  freeSpots: [],
  paidSpots: [],
  pendingSpots: [],
}

// Async thunk to fetch owner spots
export const getOwnerSpots = createAsyncThunk<
  OwnerSpotsResponse,
  void,
  { rejectValue: string }
>("owner/getSpots", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/parking-spaces")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to get owner spots",
    )
  }
})

// Async thunk to delete a parking spot
export const deleteParkingSpot = createAsyncThunk<
  string, // Return the ID of the deleted spot
  string, // Argument: ID of the spot to delete
  { rejectValue: string }
>("owner/deleteSpot", async (spotId, { rejectWithValue }) => {
  try {
    const response = await axios.delete(`/parking-spaces/${spotId}`)
    if (response.status === 200) {
      return spotId
    } else {
      return rejectWithValue("Failed to delete the spot")
    }
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.error || "Failed to delete the spot",
    )
  }
})

// Async thunk to update a parking spot
export const updateParkingSpot = createAsyncThunk<
  ParkingSpace,
  {
    id: string
    data: Partial<ParkingSpace> & { requireReverification?: boolean }
  },
  { rejectValue: string }
>("owner/updateSpot", async ({ id, data }, { rejectWithValue }) => {
  console.log(`Thunk invoked with ID: ${id} and data:`, data)
  try {
    const response = await axios.patch(`/parking-spaces/${id}`, data)
    console.log("Thunk response:", response.data)
    return response.data
  } catch (error: any) {
    console.error("Thunk error:", error)
    return rejectWithValue(
      error.response?.data?.error || "Failed to update parking spot",
    )
  }
})

// Async thunk to submit verification
export const submitVerification = createAsyncThunk<
  ParkingSpace, // Return the updated ParkingSpace after verification submission
  { spotId: string; formData: FormData }, // Argument type
  { rejectValue: string }
>(
  "owner/submitVerification",
  async ({ spotId, formData }, { rejectWithValue }) => {
    try {
      console.log("made it")
      formData.append("spotID", spotId)
      const response = await axios.post(
        `/parking-spaces/${spotId}/verify`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      )
      return response.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to submit verification",
      )
    }
  },
)

// Async thunk to rate renter
export const rateRenter = createAsyncThunk<
  null,
  { reservationId: string; score: number }, // Argument type
  { rejectValue: string }
>("owner/rateRenter", async ({ reservationId, score }, { rejectWithValue }) => {
  try {
    await axios.post(`reservations/${reservationId}/rate-renter`, {
      score: score,
    })
    return null
  } catch (error: any) {
    if (error.status === 401) {
      return rejectWithValue("Invalid email or password")
    }
    return rejectWithValue("Login failed")
  }
})

export const getRating = createAsyncThunk<
  number,
  { reservationId: string }, // Argument type
  { rejectValue: string }
>("owner/getRating", async ({ reservationId }, { rejectWithValue }) => {
  try {
    const result = await axios.get(
      `reservations/${reservationId}/rate-renter`,
      {},
    )
    return result.data
  } catch (error: any) {
    if (error.status === 401) {
      return rejectWithValue("Invalid email or password")
    }
    return rejectWithValue("Login failed")
  }
})

const ownerSlice = createSlice({
  name: "owner",
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      /*// Added reducers for getAllPendingSpots
            .addCase(getAllPendingSpots.pending, (state: OwnerState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllPendingSpots.fulfilled, (state: OwnerState, action) => {
                state.loading = false;
                state.pendingSpots = action.payload.pendingSpaces;
            })
            .addCase(getAllPendingSpots.rejected, (state: OwnerState, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })*/

      // Handle getOwnerSpots
      .addCase(getOwnerSpots.pending, (state: OwnerState) => {
        state.loading = true
        state.error = null
      })
      .addCase(getOwnerSpots.fulfilled, (state: OwnerState, action) => {
        state.loading = false
        const { spaces } = action.payload
        state.pendingSpots = spaces.filter(
          (spot) => spot.verification_status === "pending",
        )
        state.paidSpots = spaces.filter(
          (spot) => spot.is_paid && spot.verification_status !== "pending",
        )
        state.freeSpots = spaces.filter(
          (spot) => !spot.is_paid && spot.verification_status !== "pending",
        )
      })
      .addCase(getOwnerSpots.rejected, (state: OwnerState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle deleteParkingSpot
      .addCase(deleteParkingSpot.pending, (state: OwnerState) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteParkingSpot.fulfilled, (state: OwnerState, action) => {
        state.loading = false
        const deletedSpotId = action.payload
        state.paidSpots = state.paidSpots.filter(
          (spot) => spot.is_paid && spot.verification_status !== "pending",
        )
        state.freeSpots = state.freeSpots.filter(
          (spot) => !spot.is_paid && spot.verification_status !== "pending",
        )
        state.pendingSpots = state.pendingSpots.filter(
          (spot) => spot.verification_status === "pending",
        )
      })
      .addCase(deleteParkingSpot.rejected, (state: OwnerState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle submitVerification
      .addCase(submitVerification.pending, (state: OwnerState) => {
        state.loading = true
        state.error = null
      })
      .addCase(submitVerification.fulfilled, (state: OwnerState, action) => {
        state.loading = false
        const updatedSpot = action.payload
        // Update the verified spot in the respective category
        state.paidSpots = state.paidSpots.map((spot) =>
          spot.id === updatedSpot.id ? updatedSpot : spot,
        )
        state.pendingSpots = state.pendingSpots.map((spot) =>
          spot.id === updatedSpot.id ? updatedSpot : spot,
        )
      })
      .addCase(submitVerification.rejected, (state: OwnerState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Handle rateRenter
      .addCase(rateRenter.pending, (state: OwnerState) => {
        // state.loading = true
        state.error = null
      })
      .addCase(rateRenter.rejected, (state: OwnerState, action) => {
        // state.loading = false
        state.error = action.payload as string
      })
      .addCase(rateRenter.fulfilled, (state: OwnerState, action) => {
        // state.loading = false
        state.error = null
      })
      // Handle getRating
      .addCase(getRating.pending, (state: OwnerState) => {
        // state.loading = true
        state.error = null
      })
      .addCase(getRating.rejected, (state: OwnerState, action) => {
        // state.loading = false
        state.error = action.payload as string
      })
      .addCase(getRating.fulfilled, (state: OwnerState, action) => {
        // state.loading = false
        state.error = null
      })
      // Handle updateParkingSpot
      .addCase(updateParkingSpot.pending, (state: OwnerState) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateParkingSpot.fulfilled, (state: OwnerState, action) => {
        state.loading = false
        const updatedSpot = action.payload

        // Update the spot in the appropriate category
        const updateSpotInCategory = (spots: ParkingSpace[]) =>
          spots.map((spot) => (spot.id === updatedSpot.id ? updatedSpot : spot))

        state.paidSpots = updateSpotInCategory(state.paidSpots)
        state.freeSpots = updateSpotInCategory(state.freeSpots)
        state.pendingSpots = updateSpotInCategory(state.pendingSpots)
      })
      .addCase(updateParkingSpot.rejected, (state: OwnerState, action) => {
        state.loading = false
        state.error = action.payload ?? "Failed to update spot"
      })
  },
})

export const { resetError } = ownerSlice.actions
export default ownerSlice.reducer
