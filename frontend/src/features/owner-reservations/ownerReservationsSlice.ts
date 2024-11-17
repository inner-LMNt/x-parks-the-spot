import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { Reservation } from "@/types/type";
import axios from "@/api/axiosInstance";

interface OwnerReservationsState {
  ownerReservations: Reservation[];
  loading: boolean;
  error: string | null;
}

const initialState: OwnerReservationsState = {
  ownerReservations: [],
  loading: false,
  error: null,
};

export const fetchOwnerReservations = createAsyncThunk(
  "ownerReservations/fetchOwnerReservations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reservations/owner");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch owner reservations",
      );
    }
  },
);

const ownerReservationsSlice = createSlice({
  name: "ownerReservations",
  initialState,
  reducers: {
    resetOwnerReservationsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOwnerReservations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOwnerReservations.fulfilled, (state, action) => {
        state.loading = false;
        state.ownerReservations = action.payload;
        state.error = null;
      })
      .addCase(fetchOwnerReservations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetOwnerReservationsError } = ownerReservationsSlice.actions;
export default ownerReservationsSlice.reducer;
