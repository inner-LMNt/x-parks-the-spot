// src/features/reservations/reservationsSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import {
  Reservation,
  ReservationCreateRequest,
  ReservationUpdateRequest,
  CarInfo,
} from "@/types/type";

/**
 * **Reservations State Interface**
 */
interface ReservationsState {
  loading: boolean;
  error: string | null;
  reservations: Reservation[];
}

/**
 * **Initial State**
 */
const initialState: ReservationsState = {
  loading: false,
  error: null,
  reservations: [],
};

/**
 * **Async Thunks**
 */

/**
 * Fetch Current User's Reservations
 * GET /reservations
 */
export const fetchUserReservations = createAsyncThunk<
    Reservation[],
    void,
    { rejectValue: string }
>("reservations/fetchUserReservations", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get<Reservation[]>("/reservations");
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return rejectWithValue("Unauthorized");
    }
    if (error.response?.status === 403) {
      return rejectWithValue("Forbidden");
    }
    if (error.response?.status === 404) {
      return rejectWithValue("Not found");
    }
    return rejectWithValue("Failed to fetch reservations");
  }
});

/**
 * Fetch Reservation Details by ID
 * GET /reservations/{id}
 */
export const fetchReservationById = createAsyncThunk<
    Reservation,
    string,
    { rejectValue: string }
>(
    "reservations/fetchReservationById",
    async (reservationId, { rejectWithValue }) => {
      try {
        const response = await axios.get<Reservation>(`/reservations/${reservationId}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 401) {
          return rejectWithValue("Unauthorized");
        }
        if (error.response?.status === 403) {
          return rejectWithValue("Forbidden");
        }
        if (error.response?.status === 404) {
          return rejectWithValue("Reservation not found");
        }
        return rejectWithValue("Failed to fetch reservation details");
      }
    }
);

/**
 * Create a New Reservation
 * POST /reservations
 */
export const bookParkingSpace = createAsyncThunk<
    Reservation,
    ReservationCreateRequest,
    { rejectValue: string }
>(
    "reservations/bookParkingSpace",
    async (reservationRequest, { rejectWithValue }) => {
      try {
        const response = await axios.post<Reservation>("/reservations", reservationRequest);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 400) {
          return rejectWithValue("Invalid input");
        }
        if (error.response?.status === 401) {
          return rejectWithValue("Unauthorized");
        }
        if (error.response?.status === 403) {
          return rejectWithValue("Forbidden");
        }
        if (error.response?.status === 409) {
          return rejectWithValue("Parking space is already locked or reserved");
        }
        return rejectWithValue("Failed to book parking space");
      }
    }
);

/**
 * Update an Existing Reservation
 * PUT /reservations/{id}
 */
export const updateReservation = createAsyncThunk<
    Reservation,
    { id: string; updateData: ReservationUpdateRequest },
    { rejectValue: string }
>(
    "reservations/updateReservation",
    async ({ id, updateData }, { rejectWithValue }) => {
      try {
        const response = await axios.put<Reservation>(`/reservations/${id}`, updateData);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 400) {
          return rejectWithValue("Invalid input");
        }
        if (error.response?.status === 401) {
          return rejectWithValue("Unauthorized");
        }
        if (error.response?.status === 403) {
          return rejectWithValue("Forbidden");
        }
        if (error.response?.status === 404) {
          return rejectWithValue("Reservation not found");
        }
        return rejectWithValue("Failed to update reservation");
      }
    }
);

/**
 * Cancel a Reservation
 * DELETE /reservations/{id}
 */
export const cancelReservation = createAsyncThunk<
    void,
    string,
    { rejectValue: string }
>(
    "reservations/cancelReservation",
    async (reservationId, { rejectWithValue }) => {
      try {
        await axios.delete(`/reservations/${reservationId}`);
      } catch (error: any) {
        if (error.response?.status === 400) {
          return rejectWithValue("Invalid input");
        }
        if (error.response?.status === 401) {
          return rejectWithValue("Unauthorized");
        }
        if (error.response?.status === 403) {
          return rejectWithValue("Forbidden");
        }
        if (error.response?.status === 404) {
          return rejectWithValue("Reservation not found");
        }
        return rejectWithValue("Failed to cancel reservation");
      }
    }
);

/**
 * **Reservations Slice**
 */
const reservationsSlice = createSlice({
  name: "reservations",
  initialState,
  reducers: {
    /**
     * Reset error state
     */
    resetError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /**
     * Handle fetchUserReservations actions
     */
    builder
        .addCase(fetchUserReservations.pending, (state : ReservationsState) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchUserReservations.fulfilled, (state : ReservationsState, action) => {
          state.loading = false;
          state.reservations = action.payload;
        })
        .addCase(fetchUserReservations.rejected, (state : ReservationsState, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to fetch reservations";
        });

    /**
     * Handle fetchReservationById actions
     */
    builder
        .addCase(fetchReservationById.pending, (state : ReservationsState) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchReservationById.fulfilled, (state : ReservationsState, action) => {
          state.loading = false;
          // Optionally, handle the fetched reservation
          const index = state.reservations.findIndex((r) => r.id === action.payload.id);
          if (index !== -1) {
            state.reservations[index] = action.payload;
          } else {
            state.reservations.push(action.payload);
          }
        })
        .addCase(fetchReservationById.rejected, (state : ReservationsState, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to fetch reservation details";
        });

    /**
     * Handle bookParkingSpace actions
     */
    builder
        .addCase(bookParkingSpace.pending, (state : ReservationsState) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(bookParkingSpace.fulfilled, (state : ReservationsState, action) => {
          state.loading = false;
          state.reservations.push(action.payload);
        })
        .addCase(bookParkingSpace.rejected, (state : ReservationsState, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to book parking space";
        });

    /**
     * Handle updateReservation actions
     */
    builder
        .addCase(updateReservation.pending, (state : ReservationsState) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(updateReservation.fulfilled, (state : ReservationsState, action) => {
          state.loading = false;
          const index = state.reservations.findIndex((r) => r.id === action.payload.id);
          if (index !== -1) {
            state.reservations[index] = action.payload;
          }
        })
        .addCase(updateReservation.rejected, (state : ReservationsState, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to update reservation";
        });

    /**
     * Handle cancelReservation actions
     */
    builder
        .addCase(cancelReservation.pending, (state : ReservationsState) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(cancelReservation.fulfilled, (state : ReservationsState, action) => {
          state.loading = false;
          // Assuming reservationId is passed as action.meta.arg
          const reservationId = action.meta.arg;
          state.reservations = state.reservations.filter((r) => r.id !== reservationId);
        })
        .addCase(cancelReservation.rejected, (state : ReservationsState, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to cancel reservation";
        });
  },
});

/**
 * **Export Actions and Reducer**
 */
export const { resetError } = reservationsSlice.actions;

export default reservationsSlice.reducer;
