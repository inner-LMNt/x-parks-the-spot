// src/features/addSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { ParkingSpace } from "@/types/type";

interface AddState {
    loading: boolean;
    error: string | null;
    success: boolean;
}

const initialState: AddState = {
    loading: false,
    error: null,
    success: false,
};

export const addParkingSpot = createAsyncThunk<
    ParkingSpace,
    FormData,
    { rejectValue: string }
>("add/addParkingSpot", async (formData, { rejectWithValue }) => {
    try {
        const response = await axios.post<ParkingSpace>("parking-spaces", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.error || "Failed to add parking spot"
        );
    }
});

const addSlice = createSlice({
    name: "add",
    initialState,
    reducers: {
        resetState(state) {
            state.loading = false;
            state.error = null;
            state.success = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addParkingSpot.pending, (state: AddState) => {
                state.loading = true;
                state.error = null;
                state.success = false;
            })
            .addCase(addParkingSpot.fulfilled, (state: AddState) => {
                state.loading = false;
                state.error = null;
                state.success = true;
            })
            .addCase(addParkingSpot.rejected, (state: AddState, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to add parking spot";
                state.success = false;
            })
            .addMatcher(
                (action: { type: string }): action is { type: "add/errorReset" } =>
                    action.type === "add/errorReset",
                (state: AddState) => {
                    state.error = null;
                    state.loading = false;
                }
            );
    },
});

export const { resetState } = addSlice.actions;

export default addSlice.reducer;
