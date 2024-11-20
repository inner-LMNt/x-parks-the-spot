// src/features/booking-car-info/ReservationCarSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "@/api/axiosInstance"
import { CarInfo } from "@/types/type"

interface ReservationCarState {
  loading: boolean
  error: string | null
  carInfo: CarInfo | null
}

const initialState: ReservationCarState = {
  loading: false,
  error: null,
  carInfo: null,
}

export const fetchReservationCar = createAsyncThunk<
  CarInfo,
  string,
  { rejectValue: string }
>(
  "reservationCar/fetchReservationCar",
  async (carInfoId, { rejectWithValue }) => {
    try {
      const response = await axios.get<CarInfo>(`/cars/${carInfoId}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch car info",
      )
    }
  },
)

const reservationCarSlice = createSlice({
  name: "reservationCar",
  initialState,
  reducers: {
    resetCarInfo(state) {
      state.carInfo = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReservationCar.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchReservationCar.fulfilled, (state, action) => {
        state.loading = false
        state.carInfo = action.payload
      })
      .addCase(fetchReservationCar.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Failed to fetch car info"
      })
  },
})

export const { resetCarInfo } = reservationCarSlice.actions
export default reservationCarSlice.reducer
