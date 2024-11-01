// src/features/parkingSpace/parkingSpaceSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { ParkingSpace } from "@/types/type";

/**
 * **Parking Space State Interface**
 */
interface ParkingSpaceState {
    loading: boolean;
    error: string | null;
    parkingSpace: ParkingSpace | null;
    lockStatus: "idle" | "locking" | "locked" | "unlocking" | "failed";
    lockExpiresAt: number | null;
}

/**
 * **Initial State**
 */
const initialState: ParkingSpaceState = {
    loading: false,
    error: null,
    parkingSpace: null,
    lockStatus: "idle",
    lockExpiresAt: null,
};



export const getAllPendingSpots = createAsyncThunk<
    { pendingSpaces: ParkingSpace[] },
    void,
    { rejectValue: string }
>("owner/getAllPendingSpots", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get("/parking-spaces/get-pending");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || "Failed to get pending parking spots");
    }
});


/**
 * Fetch Parking Space Details
 * GET /parking-spaces/{id}
 */
export const fetchParkingSpace = createAsyncThunk<
    ParkingSpace,
    string,
    { rejectValue: string }
>(
    "parkingSpace/fetchParkingSpace",
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            const response = await axios.get<ParkingSpace>(
                `/parking-spaces/${parkingSpaceId}`
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue("Unauthorized");
            }
            if (error.response?.status === 403) {
                return rejectWithValue("Forbidden");
            }
            if (error.response?.status === 404) {
                return rejectWithValue("Not found");
            }
            return rejectWithValue("Failed to fetch parking space");
        }
    }
);

/**
 * Lock a Parking Space
 * POST /reservations/lock
 */
export const lockParkingSpace = createAsyncThunk<
    { expiresAt: number },
    { parking_space_id: string; lock_duration: string },
    { rejectValue: string }
>(
    "parkingSpace/lockParkingSpace",
    async ({ parking_space_id, lock_duration }, { rejectWithValue }) => {
        try {
            const response = await axios.post<{ expiresAt: number }>(
                "/reservations/lock",
                {
                    parking_space_id,
                    lock_duration,
                }
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue("Invalid input data");
            }
            if (error.response?.status === 401) {
                return rejectWithValue("Unauthorized");
            }
            if (error.response?.status === 403) {
                return rejectWithValue("Forbidden");
            }
            if (error.response?.status === 409) {
                return rejectWithValue("Parking space is already locked or reserved");
            }
            return rejectWithValue("Failed to lock parking space");
        }
    }
);

/**
 * Unlock a Parking Space
 * POST /reservations/unlock
 */
export const unlockParkingSpace = createAsyncThunk<
    void,
    string,
    { rejectValue: string }
>(
    "parkingSpace/unlockParkingSpace",
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            await axios.post("/reservations/unlock", {
                parking_space_id: parkingSpaceId,
            });
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue("Invalid input data");
            }
            if (error.response?.status === 401) {
                return rejectWithValue("Unauthorized");
            }
            if (error.response?.status === 403) {
                return rejectWithValue("Forbidden");
            }
            if (error.response?.status === 404) {
                return rejectWithValue("Parking space not locked by user");
            }
            return rejectWithValue("Failed to unlock parking space");
        }
    }
);

/**
 * Update the status of a parking spot
 * PUT /parking-spaces/update
 */
export const markSpotTaken = createAsyncThunk<
    void,
    { parkingSpaceId: string; formData: FormData },
    { rejectValue: string }
>("parkingSpace/markSpotTaken", async ({ parkingSpaceId, formData }, { rejectWithValue }) => {
    try {
        await axios.post(`/parking-spaces/${parkingSpaceId}/taken`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.error || "Failed to update spot status"
        );
    }
});


/**
 * **Parking Space Slice**
 */
const parkingSpaceSlice = createSlice({
    name: "parkingSpace",
    initialState,
    reducers: {
        /**
         * Reset error state
         */
        resetError(state) {
            state.error = null;
        },
        /**
         * Reset parking space state
         */
        resetParkingSpace(state) {
            state.parkingSpace = null;
            state.lockStatus = "idle";
            state.lockExpiresAt = null;
            state.error = null;
            state.loading = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(markSpotTaken.pending, (state: ParkingSpaceState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(markSpotTaken.fulfilled, (state: ParkingSpaceState) => {
                state.loading = false;
            })
            .addCase(markSpotTaken.rejected, (state: ParkingSpaceState, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to update spot status";
            });
        /**
         * Handle fetchParkingSpace actions
         */
        builder
            .addCase(fetchParkingSpace.pending, (state: ParkingSpaceState) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchParkingSpace.fulfilled, (state: ParkingSpaceState, action) => {
                state.loading = false;
                state.parkingSpace = action.payload;
            })
            .addCase(fetchParkingSpace.rejected, (state: ParkingSpaceState, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch parking space";
            });

        /**
         * Handle lockParkingSpace actions
         */
        builder
            .addCase(lockParkingSpace.pending, (state: ParkingSpaceState) => {
                state.lockStatus = "locking";
                state.error = null;
            })
            .addCase(lockParkingSpace.fulfilled, (state: ParkingSpaceState, action) => {
                state.lockStatus = "locked";
                state.lockExpiresAt = action.payload.expiresAt;
            })
            .addCase(lockParkingSpace.rejected, (state: ParkingSpaceState, action) => {
                state.lockStatus = "failed";
                state.error = action.payload || "Failed to lock parking space";
            });

        /**
         * Handle unlockParkingSpace actions
         */
        builder
            .addCase(unlockParkingSpace.pending, (state: ParkingSpaceState) => {
                state.lockStatus = "unlocking";
                state.error = null;
            })
            .addCase(unlockParkingSpace.fulfilled, (state: ParkingSpaceState) => {
                state.lockStatus = "idle";
                state.lockExpiresAt = null;
            })
            .addCase(unlockParkingSpace.rejected, (state: ParkingSpaceState, action) => {
                state.lockStatus = "failed";
                state.error = action.payload || "Failed to unlock parking space";
            });


    },
});

/**
 * **Export Actions and Reducer**
 */
export const { resetError, resetParkingSpace } = parkingSpaceSlice.actions;

export default parkingSpaceSlice.reducer;
