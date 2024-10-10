import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { ParkingSpace } from "@/types/type";

interface OwnerSpotsResponse {
    paidSpaces: ParkingSpace[];
    freeSpots: ParkingSpace[];
    pendingSpaces: ParkingSpace[];
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
    ParkingSpace, // Return type: Updated ParkingSpace
    { id: string; data: Partial<ParkingSpace> & { requireReverification?: boolean } }, // Argument type
    { rejectValue: string }
>(
    "owner/updateSpot",
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await axios.patch(`/parking-spaces/${id}`, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to update parking spot");
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
            const response = await axios.post(`/parking-spaces/${spotId}/verify`, formData, {
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
                const { paidSpaces, freeSpots, pendingSpaces } = action.payload;

                state.paidSpots = paidSpaces;
                state.freeSpots = freeSpots;
                state.pendingSpots = pendingSpaces;
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
                state.paidSpots = state.paidSpots.filter(spot => spot.id !== deletedSpotId);
                state.freeSpots = state.freeSpots.filter(spot => spot.id !== deletedSpotId);
                state.pendingSpots = state.pendingSpots.filter(spot => spot.id !== deletedSpotId);
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
            });
    },
});

export const { resetError } = ownerSlice.actions;
export default ownerSlice.reducer;
