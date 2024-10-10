// src/store/slices/ownerSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { ParkingSpace } from "@/types/type";
import {logger} from "bs-logger";

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
            // Handle getOwnerSpots (assuming it's defined elsewhere)
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
                state.error = action.payload;
            })
            // Handle deleteParkingSpot (assuming it's defined elsewhere)
            .addCase(deleteParkingSpot.pending, (state: OwnerState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteParkingSpot.fulfilled, (state: OwnerState, action) => {
                state.loading = false;
                const deletedSpotId = action.payload;
                // Remove the deleted spot from all categories
                state.paidSpots = state.paidSpots.filter(spot => spot.id !== deletedSpotId);
                state.freeSpots = state.freeSpots.filter(spot => spot.id !== deletedSpotId);
                state.pendingSpots = state.pendingSpots.filter(spot => spot.id !== deletedSpotId);
            })
            .addCase(deleteParkingSpot.rejected, (state: OwnerState, action) => {
                state.loading = false;
                state.error = action.payload;
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
                state.error = action.payload;
            });
    },
});

export const { resetError } = ownerSlice.actions;
export default ownerSlice.reducer;
