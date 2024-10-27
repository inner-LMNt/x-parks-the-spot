import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { ParkingSpace } from "@/types/type";

interface DisputeRequest {
    id: string;
    reason: string;
    user: string;
    details: string;
}

interface AdminState {
    pendingSpots: ParkingSpace[];
    disputeRequests: DisputeRequest[];
    loading: boolean;
    error: string | null;
}

const initialState: AdminState = {
    pendingSpots: [],
    disputeRequests: [],
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
    ParkingSpace,
    { spotId: string; is_verified: boolean },
    { rejectValue: string }
>("admin/verifySpot", async ({ spotId, is_verified }, { rejectWithValue }) => {
    try {
        const response = await axios.post(`/parking-spaces/verify-parking-space`, { spotId, is_verified });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to verify parking spot");
    }
});

// Async thunk to fetch all disputes/cancellations
export const getDisputeRequests = createAsyncThunk<
    { disputes: DisputeRequest[] },
    void,
    { rejectValue: string }
>("admin/getDisputeRequests", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/disputes");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to get disputes/cancellations");
    }
});

// Async thunk to create a new dispute (cancellation request)
export const createDispute = createAsyncThunk<
    DisputeRequest,
    { disputeType: string; message: string; parkingSpaceId: string },
    { rejectValue: string }
>(
    "admin/createDispute",
    async ({ disputeType, message, parkingSpaceId }, { rejectWithValue }) => {
        try {
            const response = await axios.post("/disputes", {
                dispute_type: disputeType, // Type of dispute (e.g., 'cancellation')
                message: message, // Message explaining the reason for the dispute
                parking_space_id: parkingSpaceId, // ID of the parking space
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to create dispute");
        }
    }
);




// Async thunk to resolve a dispute or cancellation
export const resolveDisputeRequest = createAsyncThunk<
    DisputeRequest,
    { requestId: string; action: "approve" | "reject" },
    { rejectValue: string }
>("admin/resolveDisputeRequest", async ({ requestId, action }, { rejectWithValue }) => {
    try {
        const response = await axios.patch(`/disputes/${requestId}`, { action });

        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to resolve dispute/cancellation");
    }
});

const adminSlice = createSlice({
    name: "admin",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Handle getAllPendingSpots
        builder
            .addCase(createDispute.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createDispute.fulfilled, (state, action) => {
                state.loading = false;
                state.disputeRequests.push(action.payload); // Add the new dispute to the list
            })
            .addCase(createDispute.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

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
                state.pendingSpots = state.pendingSpots.map((spot) =>
                    spot.id === updatedSpot.id ? updatedSpot : spot
                );
            })
            .addCase(verifyParkingSpot.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Handle getDisputeRequests
            .addCase(getDisputeRequests.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getDisputeRequests.fulfilled, (state, action) => {
                state.loading = false;
                state.disputeRequests = action.payload.disputes;
            })
            .addCase(getDisputeRequests.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Handle resolveDisputeRequest
            .addCase(resolveDisputeRequest.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resolveDisputeRequest.fulfilled, (state, action) => {
                state.loading = false;
                const resolvedRequest = action.payload;
                state.disputeRequests = state.disputeRequests.map((request) =>
                    request.id === resolvedRequest.id ? resolvedRequest : request
                );
            })

            .addCase(resolveDisputeRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default adminSlice.reducer;
