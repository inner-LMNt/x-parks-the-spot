// src/features/reservations/reservationsSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '@/api/axiosInstance';
import {
    ParkingSpace,
    Reservation,
    ReservationCreateRequest,
    CarInfo,
} from '@/types/type';

interface ReservationsState {
    loading: boolean;
    error: string | null;
    reservations: Reservation[];
    reservationsForSpace: Reservation[];
    parkingSpace: ParkingSpace | null;
    lockStatus: 'idle' | 'locking' | 'locked' | 'failed';
    lockExpiresAt: number | null;
    carInfos: CarInfo[];
}

const initialState: ReservationsState = {
    loading: false,
    error: null,
    reservations: [],
    reservationsForSpace: [],
    parkingSpace: null,
    lockStatus: 'idle',
    lockExpiresAt: null,
    carInfos: [],
};

/**
 * Async Thunks
 */

// Fetch user reservations
export const fetchUserReservations = createAsyncThunk<
    Reservation[],
    void,
    { rejectValue: string }
>('reservations/fetchUserReservations', async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get<Reservation[]>('/reservations');
        return response.data;
    } catch (error: any) {
        if (error.status === 404) {
            return rejectWithValue('Not found');
        }
        if (error.status === 401) {
            return rejectWithValue('Email not found');
        }
        return rejectWithValue(error.status);
    }
});

// Fetch reservations for a specific parking space
export const fetchUserReservationsForSpace = createAsyncThunk<
    Reservation[],
    string,
    { rejectValue: string }
>(
    'reservations/fetchUserReservationsForSpace',
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            const response = await axios.get<Reservation[]>('/reservations/spaces', {
                params: { parking_space_id: parkingSpaceId },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || 'Failed to fetch reservations'
            );
        }
    }
);

// Fetch parking space details
export const fetchParkingSpace = createAsyncThunk<
    ParkingSpace,
    string,
    { rejectValue: string }
>('reservations/fetchParkingSpace', async (parkingSpaceId, { rejectWithValue }) => {
    try {
        const response = await axios.get<ParkingSpace>('/parking-space', {
            params: { parking_space_id: parkingSpaceId },
        });
        return response.data;
    } catch (error: any) {
        if (error.status === 404) {
            return rejectWithValue('Not found');
        }
        if (error.status === 401) {
            return rejectWithValue('Email not found');
        }
        return rejectWithValue(error.status);
    }
});

// The following thunks are related to locking functionality.
// Since locking is not being implemented yet, they are commented out.

 // Lock a parking space
 export const lockParkingSpace = createAsyncThunk<
 { expiresAt: number },
 string,
 { rejectValue: string }
 >(
 'reservations/lockParkingSpace',
 async (parkingSpaceId, { rejectWithValue }) => {
 try {
 const response = await axios.post('/parking-space/lock', null, {
 params: { parking_space_id: parkingSpaceId },
 });
 return response.data; // { expiresAt: timestamp }
 } catch (error: any) {
 return rejectWithValue(
 error.response?.data?.message || 'Failed to lock parking space'
 );
 }
 }
 );

 // Unlock a parking space
 export const unlockParkingSpace = createAsyncThunk<
 void,
 string,
 { rejectValue: string }
 >(
 'reservations/unlockParkingSpace',
 async (parkingSpaceId, { rejectWithValue }) => {
 try {
 await axios.post('/parking-space/unlock', null, {
 params: { parking_space_id: parkingSpaceId },
 });
 } catch (error: any) {
 return rejectWithValue(
 error.response?.data?.message || 'Failed to unlock parking space'
 );
 }
 }
 );

// Book a parking space (create a reservation)
export const bookParkingSpace = createAsyncThunk<
    void,
    ReservationCreateRequest,
    { rejectValue: string }
>('reservations/bookParkingSpace', async (reservationRequest, { rejectWithValue }) => {
    try {
        await axios.post('/reservations', reservationRequest);
    } catch (error: any) {
        if (error.status === 404) {
            return rejectWithValue('Not found');
        }
        if (error.status === 401) {
            return rejectWithValue('Email not found');
        }
        return rejectWithValue(error.status);}}
        );

// Fetch user's car information
export const fetchUserCarInfos = createAsyncThunk<
    CarInfo[],
    void,
    { rejectValue: string }
>('reservations/fetchUserCarInfos', async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get<CarInfo[]>('/cars');
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.message || 'Failed to fetch car information'
        );
    }
});

/**
 * **Reservations Slice**
 */
const reservationsSlice = createSlice({
    name: 'reservations',
    initialState,
    reducers: {
        /**
         * Reset error state
         */
        resetError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        /**
         * Handle fetchUserReservations actions
         */
        builder
            .addCase(fetchUserReservations.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserReservations.fulfilled, (state, action) => {
                state.loading = false;
                state.reservations = action.payload;
            })
            .addCase(fetchUserReservations.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch reservations';
            });

        /**
         * Handle fetchUserReservationsForSpace actions
         */
        builder
            .addCase(fetchUserReservationsForSpace.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserReservationsForSpace.fulfilled, (state, action) => {
                state.loading = false;
                state.reservationsForSpace = action.payload;
            })
            .addCase(fetchUserReservationsForSpace.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch reservations';
            });

        /**
         * Handle fetchParkingSpace actions
         */
        builder
            .addCase(fetchParkingSpace.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchParkingSpace.fulfilled, (state, action) => {
                state.loading = false;
                state.parkingSpace = action.payload;
            })
            .addCase(fetchParkingSpace.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch parking space';
            });

        /**
         * The following cases handle locking functionality.
         * Since locking is not being implemented yet, they are commented out.
         */
        // Handle lockParkingSpace actions
        builder
          .addCase(lockParkingSpace.pending, (state) => {
            state.lockStatus = 'locking';
            state.error = null;
          })
          .addCase(lockParkingSpace.fulfilled, (state, action) => {
            state.lockStatus = 'locked';
            state.lockExpiresAt = action.payload.expiresAt;
          })
          .addCase(lockParkingSpace.rejected, (state, action) => {
            state.lockStatus = 'failed';
            state.error = action.payload || 'Failed to lock parking space';
          });

        // Handle unlockParkingSpace actions
        builder.addCase(unlockParkingSpace.fulfilled, (state) => {
          state.lockStatus = 'idle';
          state.lockExpiresAt = null;
        });

        /**
         * Handle bookParkingSpace actions
         */
        builder
            .addCase(bookParkingSpace.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bookParkingSpace.fulfilled, (state) => {
                state.loading = false;
                // Optionally, you can add the new reservation to the reservations array
            })
            .addCase(bookParkingSpace.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to book parking space';
            });

        /**
         * Handle fetchUserCarInfos actions
         */
        builder
            .addCase(fetchUserCarInfos.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserCarInfos.fulfilled, (state, action) => {
                state.loading = false;
                state.carInfos = action.payload;
            })
            .addCase(fetchUserCarInfos.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch car information';
            });
    },
});

/**
 * **Export Actions and Reducer**
 */
export const { resetError } = reservationsSlice.actions;

export default reservationsSlice.reducer;
