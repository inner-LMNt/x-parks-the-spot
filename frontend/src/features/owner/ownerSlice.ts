import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { ParkingSpace, SearchRequest, SearchResponse } from "@/types/type";

interface OwnerState {
    loading: boolean;
    error: string | null;
    freeSpots: ParkingSpace[];
    paidSpots: ParkingSpace[];
}

const initialState: OwnerState = {
    loading: false,
    error: null,
    freeSpots: [],
    paidSpots: [],
};

export const getOwnerSpots = createAsyncThunk<
    SearchResponse,
    { paid_status: 'ALL' | 'PAID' | 'FREE' },
    { rejectValue: string }
>("owner/getSpots", async ({ paid_status }, { rejectWithValue }) => {
    try {
        const searchRequest: SearchRequest = {
            paid_status: paid_status,
        };
        const response = await axios.post<SearchResponse>("/search", searchRequest);
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || "Failed to get owner spots");
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
                if (action.meta.arg.paid_status === 'FREE') {
                    //@ts-ignore

                    state.freeSpots = action.payload.spots;
                } else if (action.meta.arg.paid_status === 'PAID') {
                    //@ts-ignore
                    state.paidSpots = action.payload.spots;
                } else {
                    // If 'ALL', we need to separate the spots
                    //@ts-ignore
                    state.freeSpots = action.payload.spots.filter((spot: ParkingSpace) => !spot.is_paid);
                    //@ts-ignore
                    state.paidSpots = action.payload.spots.filter((spot: ParkingSpace) => spot.is_paid);
                }
            })
            .addCase(getOwnerSpots.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { resetError } = ownerSlice.actions;
export default ownerSlice.reducer;