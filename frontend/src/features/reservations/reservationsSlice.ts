// src/features/reservations/reservationsSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '@/api/axiosInstance';
import {
    ParkingSpace,
    Reservation,
    ReservationCreateRequest,
    CarInfo,
    ReservationUpdateRequest,
} from '@/types/type';

/**
 * **Reservations State Interface**
 */
interface ReservationsState {
    loading: boolean;
    error: string | null;
    reservations: Reservation[];
    parkingSpace: ParkingSpace | null;
    lockStatus: 'idle' | 'locking' | 'locked' | 'failed';
    lockExpiresAt: number | null;
    carInfos: CarInfo[];
}

/**
 * **Initial State**
 */
const initialState: ReservationsState = {
    loading: false,
    error: null,
    reservations: [],
    parkingSpace: null,
    lockStatus: 'idle',
    lockExpiresAt: null,
    carInfos: [],
};

/**
 * **Async Thunks**
 */

/**
 * Fetch Current User's Reservations
 * GET /reservations
 */
export const fetchUserReservations = createAsyncThunk<
    Reservation[],
    void,
    { rejectValue: string }
>(
    'reservations/fetchUserReservations',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get<Reservation[]>('/reservations');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 404) {
                return rejectWithValue('Not found');
            }
            return rejectWithValue('Failed to fetch reservations');
        }
    }
);

/**
 * Fetch Reservation Details by ID
 * GET /reservations/{id}
 */
export const fetchReservationById = createAsyncThunk<
    Reservation,
    string,
    { rejectValue: string }
>(
    'reservations/fetchReservationById',
    async (reservationId, { rejectWithValue }) => {
        try {
            const response = await axios.get<Reservation>(`/reservations/${reservationId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 404) {
                return rejectWithValue('Reservation not found');
            }
            return rejectWithValue('Failed to fetch reservation details');
        }
    }
);

/**
 * Create a New Reservation
 * POST /reservations
 */
export const bookParkingSpace = createAsyncThunk<
    Reservation,
    ReservationCreateRequest,
    { rejectValue: string }
>(
    'reservations/bookParkingSpace',
    async (reservationRequest, { rejectWithValue }) => {
        try {
            const response = await axios.post<Reservation>('/reservations', reservationRequest);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue('Invalid input');
            }
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 409) {
                return rejectWithValue('Parking space is already locked or reserved');
            }
            return rejectWithValue('Failed to book parking space');
        }
    }
);

/**
 * Update an Existing Reservation
 * PUT /reservations/{id}
 */
export const updateReservation = createAsyncThunk<
    Reservation,
    { id: string; updateData: ReservationUpdateRequest },
    { rejectValue: string }
>(
    'reservations/updateReservation',
    async ({ id, updateData }, { rejectWithValue }) => {
        try {
            const response = await axios.put<Reservation>(`/reservations/${id}`, updateData);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue('Invalid input');
            }
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 404) {
                return rejectWithValue('Reservation not found');
            }
            return rejectWithValue('Failed to update reservation');
        }
    }
);

/**
 * Cancel a Reservation
 * DELETE /reservations/{id}
 */
export const cancelReservation = createAsyncThunk<
    void,
    string,
    { rejectValue: string }
>(
    'reservations/cancelReservation',
    async (reservationId, { rejectWithValue }) => {
        try {
            await axios.delete(`/reservations/${reservationId}`);
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 404) {
                return rejectWithValue('Reservation not found');
            }
            return rejectWithValue('Failed to cancel reservation');
        }
    }
);

/**
 * Fetch Parking Space Details
 * GET /parking-spaces/{id}
 */
export const fetchParkingSpace = createAsyncThunk<
    ParkingSpace,
    string,
    { rejectValue: string }
>(
    'reservations/fetchParkingSpace',
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            const response = await axios.get<ParkingSpace>(`/parking-spaces/${parkingSpaceId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 404) {
                return rejectWithValue('Parking space not found');
            }
            return rejectWithValue('Failed to fetch parking space');
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
    'reservations/lockParkingSpace',
    async ({ parking_space_id, lock_duration }, { rejectWithValue }) => {
        try {
            const response = await axios.post<{ expiresAt: number }>('/reservations/lock', {
                parking_space_id,
                lock_duration,
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue('Invalid input data');
            }
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 409) {
                return rejectWithValue('Parking space is already locked or reserved');
            }
            return rejectWithValue('Failed to lock parking space');
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
    'reservations/unlockParkingSpace',
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            await axios.post('/reservations/unlock', { parking_space_id: parkingSpaceId });
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue('Invalid input data');
            }
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            if (error.response?.status === 404) {
                return rejectWithValue('Parking space not locked by user');
            }
            return rejectWithValue('Failed to unlock parking space');
        }
    }
);

/**
 * Fetch User's Car Information
 * GET /cars
 */
export const fetchUserCarInfos = createAsyncThunk<
    CarInfo[],
    void,
    { rejectValue: string }
>(
    'reservations/fetchUserCarInfos',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get<CarInfo[]>('/cars');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            if (error.response?.status === 403) {
                return rejectWithValue('Forbidden');
            }
            return rejectWithValue('Failed to fetch car information');
        }
    }
);

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
         * Handle fetchReservationById actions
         */
        builder
            .addCase(fetchReservationById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReservationById.fulfilled, (state, action) => {
                state.loading = false;
                // Optionally, handle the fetched reservation
                const index = state.reservations.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.reservations[index] = action.payload;
                } else {
                    state.reservations.push(action.payload);
                }
            })
            .addCase(fetchReservationById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch reservation details';
            });

        /**
         * Handle bookParkingSpace actions
         */
        builder
            .addCase(bookParkingSpace.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bookParkingSpace.fulfilled, (state, action) => {
                state.loading = false;
                state.reservations.push(action.payload);
            })
            .addCase(bookParkingSpace.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to book parking space';
            });

        /**
         * Handle updateReservation actions
         */
        builder
            .addCase(updateReservation.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateReservation.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.reservations.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.reservations[index] = action.payload;
                }
            })
            .addCase(updateReservation.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to update reservation';
            });

        /**
         * Handle cancelReservation actions
         */
        builder
            .addCase(cancelReservation.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(cancelReservation.fulfilled, (state, action) => {
                state.loading = false;
                // Assuming reservationId is passed as action.meta.arg
                const reservationId = action.meta.arg;
                state.reservations = state.reservations.filter(r => r.id !== reservationId);
            })
            .addCase(cancelReservation.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to cancel reservation';
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
         * Handle lockParkingSpace actions
         */
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

        /**
         * Handle unlockParkingSpace actions
         */
        builder
            .addCase(unlockParkingSpace.pending, (state) => {
                state.lockStatus = 'unlocking';
                state.error = null;
            })
            .addCase(unlockParkingSpace.fulfilled, (state) => {
                state.lockStatus = 'idle';
                state.lockExpiresAt = null;
            })
            .addCase(unlockParkingSpace.rejected, (state, action) => {
                state.lockStatus = 'failed';
                state.error = action.payload || 'Failed to unlock parking space';
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
