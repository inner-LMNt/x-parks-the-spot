// src/features/cars/carSlice.ts

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { CarInfo } from "@/types/type";

/**
 * **Cars State Interface**
 */
interface CarsState {
    loading: boolean;
    error: string | null;
    cars: CarInfo[];
}

/**
 * **Initial State**
 */
const initialState: CarsState = {
    loading: false,
    error: null,
    cars: [],
};

/**
 * **Async Thunks**
 */

/**
 * Fetch User's Cars
 * GET /cars
 */
export const fetchUserCars = createAsyncThunk<
    CarInfo[],
    void,
    { rejectValue: string }
>("cars/fetchUserCars", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get<CarInfo[]>("/cars");
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 401) {
            return rejectWithValue("Unauthorized");
        }
        if (error.response?.status === 403) {
            return rejectWithValue("Forbidden");
        }
        return rejectWithValue(error.response?.data?.error || "Failed to fetch cars");
    }
});

/**
 * Add a New Car
 * POST /cars
 */
export const addCar = createAsyncThunk<
    CarInfo,
    Partial<CarInfo>,
    { rejectValue: string }
>("cars/addCar", async (carData, { rejectWithValue }) => {
    try {
        const response = await axios.post<CarInfo>("/cars", carData);
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 400) {
            return rejectWithValue(error.response?.data?.error || "Invalid input");
        }
        if (error.response?.status === 401) {
            return rejectWithValue("Unauthorized");
        }
        if (error.response?.status === 403) {
            return rejectWithValue("Forbidden");
        }
        return rejectWithValue(error.response?.data?.error || "Failed to add car");
    }
});

/**
 * **Cars Slice**
 */
const carSlice = createSlice({
    name: "cars",
    initialState,
    reducers: {
        /**
         * Reset error state
         */
        resetCarError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        /**
         * Handle fetchUserCars actions
         */
        builder
            .addCase(fetchUserCars.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserCars.fulfilled, (state, action) => {
                state.loading = false;
                state.cars = action.payload;
            })
            .addCase(fetchUserCars.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch cars";
            });

        /**
         * Handle addCar actions
         */
        builder
            .addCase(addCar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addCar.fulfilled, (state, action) => {
                state.loading = false;
                state.cars.push(action.payload);
            })
            .addCase(addCar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to add car";
            });
    },
});

/**
 * **Export Actions and Reducer**
 */
export const { resetCarError } = carSlice.actions;

export default carSlice.reducer;
