// src/store/slices/ownerSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { ParkingSpace } from "@/types/type";

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
            .addCase(getOwnerSpots.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getOwnerSpots.fulfilled, (state, action) => {
                state.loading = false;
                const { paidSpaces, freeSpots, pendingSpaces } = action.payload;

                state.paidSpots = paidSpaces;
                state.freeSpots = freeSpots;
                state.pendingSpots = pendingSpaces;
            })
            .addCase(getOwnerSpots.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { resetError } = ownerSlice.actions;
export default ownerSlice.reducer;
