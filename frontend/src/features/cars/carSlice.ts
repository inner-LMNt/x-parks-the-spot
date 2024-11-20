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
    return rejectWithValue(
      error.response?.data?.error || "Failed to fetch cars",
    );
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
 * Update a Car
 * PATCH /cars/id
 */
export const updateCar = createAsyncThunk<
  CarInfo,
  { id: string; updateData: Partial<CarInfo> },
  { rejectValue: string }
>("cars/updateCar", async ({ id, updateData }, { rejectWithValue }) => {
  try {
    const response = await axios.patch<CarInfo>(`/cars/${id}`, updateData);
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
    return rejectWithValue(
      error.response?.data?.error || "Failed to update car",
    );
  }
});

/**
 * Delete a Car
 * DELETE /cars/id
 */
export const deleteCar = createAsyncThunk<
  CarInfo,
  string,
  { rejectValue: string }
>("cars/deleteCar", async (id, { rejectWithValue }) => {
  try {
    const response = await axios.delete<CarInfo>(`/cars/${id}`);
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
    return rejectWithValue(
      error.response?.data?.error || "Failed to update car",
    );
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
      .addCase(fetchUserCars.pending, (state: CarsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserCars.fulfilled, (state: CarsState, action) => {
        state.loading = false;
        state.cars = action.payload;
      })
      .addCase(fetchUserCars.rejected, (state: CarsState, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch cars";
      });

    /**
     * Handle addCar actions
     */
    builder
      .addCase(addCar.pending, (state: CarsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCar.fulfilled, (state: CarsState, action) => {
        state.loading = false;
        state.cars.push(action.payload);
      })
      .addCase(addCar.rejected, (state: CarsState, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add car";
      });

    /**
     * Handle updateCar actions
     */
    builder
      .addCase(updateCar.pending, (state: CarsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCar.fulfilled, (state: CarsState, action) => {
        state.loading = false;
        // Replace the updated car in the list
        var i = state.cars.findIndex((x) => x.id == action.payload.id);
        state.cars[i] = action.payload;
      })
      .addCase(updateCar.rejected, (state: CarsState, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update car";
      });

    /**
     * Handle deleteCar actions
     */
    builder
      .addCase(deleteCar.pending, (state: CarsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCar.fulfilled, (state: CarsState, action) => {
        state.loading = false;
        // Delete the updated car in the list
        var i = state.cars.findIndex((x) => x.id == action.payload.id);
        state.cars.splice(i, 1);
      })
      .addCase(deleteCar.rejected, (state: CarsState, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete car";
      });
  },
});

/**
 * **Export Actions and Reducer**
 */
export const { resetCarError } = carSlice.actions;

export default carSlice.reducer;
