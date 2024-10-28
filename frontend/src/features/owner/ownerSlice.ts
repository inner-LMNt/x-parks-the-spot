import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { ParkingSpace } from "@/types/type";
import {logger} from "bs-logger";

interface OwnerSpotsResponse {
    paidSpots: ParkingSpace[];
    freeSpots: ParkingSpace[];
    pendingSpots: ParkingSpace[];
}

interface OwnerState {
    loading: boolean;
    error: string | null;
    freeSpots: ParkingSpace[];
    paidSpots: ParkingSpace[];
    pendingSpots: ParkingSpace[];
}

const initialState: OwnerState = {
    loading: false,
    error: null,
    freeSpots: [],
    paidSpots: [],
    pendingSpots: [],
};

// Async thunk to fetch owner spots
export const getOwnerSpots = createAsyncThunk<
    OwnerSpotsResponse,
    void,
    { rejectValue: string }
>("owner/getSpots", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/parking-spaces");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to get owner spots");
    }
});

// Async thunk to delete a parking spot
export const deleteParkingSpot = createAsyncThunk<
    string, // Return the ID of the deleted spot
    string, // Argument: ID of the spot to delete
    { rejectValue: string }
>("owner/deleteSpot", async (spotId, { rejectWithValue }) => {
    try {
        const response = await axios.delete(`/parking-spaces/${spotId}`);
        if (response.status === 200) {
            return spotId;
        } else {
            return rejectWithValue("Failed to delete the spot");
        }
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to delete the spot");
    }
});

// Async thunk to update a parking spot
export const updateParkingSpot = createAsyncThunk<
    ParkingSpace,
    { id: string; data: Partial<ParkingSpace> & { requireReverification?: boolean } },
    { rejectValue: string }
>(
    "owner/updateSpot",
    async ({ id, data }, { rejectWithValue }) => {
        console.log(`Thunk invoked with ID: ${id} and data:`, data);
        try {
            const response = await axios.patch(`/parking-spaces/${id}`, data);
            console.log('Thunk response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('Thunk error:', error);
            return rejectWithValue(error.response?.data?.error || "Failed to update parking spot");
        }
    }
);

// Async thunk to verify or reject a parking spot
export const verifyParkingSpot = createAsyncThunk<
    ParkingSpace, // Return the updated ParkingSpace after verification
    { spotId: string; is_verified: boolean }, // Argument: ID of the spot to verify/reject and the decision
    { rejectValue: string }
>(
    "owner/verifySpot",
    async ({ spotId, is_verified }, { rejectWithValue }) => {
        try {
            console.log("spot ",spotId)
            console.log("veri ",is_verified)
            // Send the spotId and is_verified in the request body
            const response = await axios.post(`/parking-spaces/verify-parking-space`, { spotId, is_verified });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to verify parking spot");
        }
    }
);


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
            formData.append('spotID', spotId);
            const response = await axios.post(`/parking-spaces/spot-verification`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;

        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to submit verification");
        }
    }
);

const ownerSlice = createSlice({
    name: "owner",
    initialState,
    reducers: {
        resetError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Handle getOwnerSpots
            .addCase(getOwnerSpots.pending, (state: OwnerState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getOwnerSpots.fulfilled, (state: OwnerState, action) => {
                state.loading = false;
                const { paidSpots, freeSpots, pendingSpots } = action.payload;

                state.paidSpots = paidSpots;
                state.freeSpots = freeSpots;
                state.pendingSpots = pendingSpots;
            })
            .addCase(getOwnerSpots.rejected, (state: OwnerState, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Handle deleteParkingSpot
            .addCase(deleteParkingSpot.pending, (state: OwnerState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteParkingSpot.fulfilled, (state: OwnerState, action) => {
                state.loading = false;
                const deletedSpotId = action.payload;
                state.paidSpots = state.paidSpots.filter(spot => spot.is_paid && spot.status !== "pending");
                state.freeSpots = state.freeSpots.filter(spot => !spot.is_paid && spot.status !== "pending");
                state.pendingSpots = state.pendingSpots.filter(spot => spot.status === "pending");
            })
            .addCase(deleteParkingSpot.rejected, (state: OwnerState, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Handle submitVerification
            .addCase(submitVerification.pending, (state: OwnerState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitVerification.fulfilled, (state: OwnerState, action) => {
                state.loading = false;
                const updatedSpot = action.payload;
                // Update the verified spot in the respective category
                state.paidSpots = state.paidSpots.map(spot =>
                    spot.id === updatedSpot.id ? updatedSpot : spot
                );
                state.pendingSpots = state.pendingSpots.map(spot =>
                    spot.id === updatedSpot.id ? updatedSpot : spot
                );
            })
            .addCase(submitVerification.rejected, (state: OwnerState, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Handle updateParkingSpot
            .addCase(updateParkingSpot.pending, (state: OwnerState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateParkingSpot.fulfilled, (state: OwnerState, action) => {
                state.loading = false;
                const updatedSpot = action.payload;

                // Update the spot in the appropriate category
                const updateSpotInCategory = (spots: ParkingSpace[]) =>
                    spots.map(spot => spot.id === updatedSpot.id ? updatedSpot : spot);

                state.paidSpots = updateSpotInCategory(state.paidSpots);
                state.freeSpots = updateSpotInCategory(state.freeSpots);
                state.pendingSpots = updateSpotInCategory(state.pendingSpots);
            })
            .addCase(updateParkingSpot.rejected, (state: OwnerState, action) => {
                state.loading = false;
                state.error = action.payload ?? 'Failed to update spot';
            });
    },
});

export const { resetError } = ownerSlice.actions;
export default ownerSlice.reducer;
