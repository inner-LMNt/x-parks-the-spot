import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { ParkingSpace } from "@/types/type";

interface Conflict {
    id: string;
    reservation_id: string;
    description: string;
    type: "Other" | "Technical" | "Billing";
    status: "open" | "in_progress" | "resolved";
    admin_response: string | null;
    created_at: string;
    updated_at: string;
    owner_name: string;
    parking_space_name: string;
    parking_space_address: string;
    start_time: string;
    end_time: string;
}

interface AdminState {
    pendingSpots: ParkingSpace[];
    conflicts: Conflict[];
    loading: boolean;
    error: string | null;
}

const initialState: AdminState = {
    pendingSpots: [],
    conflicts: [],
    loading: false,
    error: null,
};

// Async thunk to update a conflict response
export const updateConflictResponse = createAsyncThunk<
    Conflict,
    { id: string; response: string },
    { rejectValue: string }
>("admin/updateConflictResponse", async ({ id, response }, { rejectWithValue }) => {
    try {
        const res = await axios.post(`/admin/update-conflict`, { id, response }); // Ensure endpoint and payload are correct
        return res.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to update conflict response");
    }
});



// Async thunk to fetch all conflicts
export const getAllConflicts = createAsyncThunk<
    { conflicts: Conflict[] },
    void,
    { rejectValue: string }
>("admin/getAllConflicts", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/admin/get-conflicts");
        return response.data; // Ensure response data is in the format { conflicts: Conflict[] }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to get conflicts");
    }
});



// Async thunk to fetch all pending parking spots
export const getAllPendingSpots = createAsyncThunk<
    { pendingSpaces: ParkingSpace[] },
    void,
    { rejectValue: string }
>("admin/getAllPendingSpots", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/admin/get-pending");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to get pending parking spots");
    }
});

// Async thunk to verify or reject a parking spot
export const verifyParkingSpot = createAsyncThunk<
    ParkingSpace,
    { spotId: string; is_verified: boolean },
    { rejectValue: string }
>("admin/verifySpot", async ({ spotId, is_verified }, { rejectWithValue }) => {
    try {
        const response = await axios.post(`/admin/verify-parking-space`, { spotId, is_verified });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to verify parking spot");
    }
});

const adminSlice =
    //@ts-ignore
    createSlice({
    name: "admin",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Handle getAllPendingSpots
        builder
            // Handle updateConflictResponse
            .addCase(updateConflictResponse.pending, (state: AdminState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateConflictResponse.fulfilled, (state: AdminState, action: any) => {
                state.loading = false;
                state.conflicts = state.conflicts.map((conflict) =>
                    conflict.id === action.payload.id
                        ? { ...conflict, admin_response: action.payload.admin_response }
                        : conflict
                );
            })
            .addCase(updateConflictResponse.rejected, (state: AdminState, action: any) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(getAllConflicts.pending, (state: AdminState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllConflicts.fulfilled, (state: AdminState, action:any) => {
                state.loading = false;
                state.conflicts = action.payload;
            })
            .addCase(getAllConflicts.rejected, (state: AdminState, action: any) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(getAllPendingSpots.pending, (state: AdminState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllPendingSpots.fulfilled, (state: AdminState, action: any) => {
                state.loading = false;
                state.pendingSpots = action.payload.pendingSpaces;
            })
            .addCase(getAllPendingSpots.rejected, (state: AdminState, action: any) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Handle verifyParkingSpot
            .addCase(verifyParkingSpot.pending, (state: AdminState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyParkingSpot.fulfilled, (state: AdminState, action: any) => {
                state.loading = false;
                const updatedSpot = action.payload;

                // Update the pendingSpots list with the verified/rejected spot
                state.pendingSpots = state.pendingSpots.map((spot) =>
                    spot.id === updatedSpot.id ? updatedSpot : spot
                );
            })
            .addCase(verifyParkingSpot.rejected, (state: AdminState, action: any) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default adminSlice.reducer;
