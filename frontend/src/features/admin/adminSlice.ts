import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { ParkingSpace } from "@/types/type";

interface AdminState {
    pendingSpots: ParkingSpace[];
    loading: boolean;
    error: string | null;
}

const initialState: AdminState = {
    pendingSpots: [],
    loading: false,
    error: null,
};

// Async thunk to fetch all pending parking spots
export const getAllPendingSpots = createAsyncThunk<
    { pendingSpaces: ParkingSpace[] },
    void,
    { rejectValue: string }
>("admin/getAllPendingSpots", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/parking-spaces/get-pending");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to get pending parking spots");
    }
});

// Async thunk to verify or reject a parking spot
export const verifyParkingSpot = createAsyncThunk<
    ParkingSpace, // Return the updated ParkingSpace after verification
    { spotId: string; is_verified: boolean }, // Argument: ID of the spot to verify/reject and the decision
    { rejectValue: string }
>("admin/verifySpot", async ({ spotId, is_verified }, { rejectWithValue }) => {
    try {
        const response = await axios.post(`/parking-spaces/verify-parking-space`, { spotId, is_verified });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to verify parking spot");
    }
});

// Admin slice
const adminSlice = createSlice({
    name: "admin",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Handle getAllPendingSpots
        builder
            .addCase(getAllPendingSpots.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllPendingSpots.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingSpots = action.payload.pendingSpaces;
            })
            .addCase(getAllPendingSpots.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Handle verifyParkingSpot
            .addCase(verifyParkingSpot.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyParkingSpot.fulfilled, (state, action) => {
                state.loading = false;
                const updatedSpot = action.payload;

                // Update the pendingSpots list with the verified/rejected spot
                state.pendingSpots = state.pendingSpots.map((spot) =>
                    spot.id === updatedSpot.id ? updatedSpot : spot
                );
            })
            .addCase(verifyParkingSpot.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default adminSlice.reducer;
