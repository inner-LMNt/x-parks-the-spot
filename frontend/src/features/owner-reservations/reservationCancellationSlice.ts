import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "@/api/axiosInstance"

interface CancellationState {
    loading: boolean
    error: string | null
    success: boolean
}

const initialState: CancellationState = {
    loading: false,
    error: null,
    success: false,
}

export const forceCancelReservation = createAsyncThunk<
    void,
    string,
    { rejectValue: string }
>("reservations/forceCancelReservation", async (reservationId, { rejectWithValue }) => {
    try {
        await axios.post(`/reservations/force-cancel/${reservationId}`)
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.error || "Failed to cancel reservation"
        )
    }
})

const reservationCancellationSlice = createSlice({
    name: "reservationCancellation",
    initialState,
    reducers: {
        resetCancellationState: (state) => {
            state.loading = false
            state.error = null
            state.success = false
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(forceCancelReservation.pending, (state: CancellationState) => {
                state.loading = true
                state.error = null
                state.success = false
            })
            .addCase(forceCancelReservation.fulfilled, (state: CancellationState) => {
                state.loading = false
                state.error = null
                state.success = true
            })
            .addCase(forceCancelReservation.rejected, (state: CancellationState, action: any) => {
                state.loading = false
                state.error = action.payload || "Failed to cancel reservation"
            })
    },
})

export const { resetCancellationState } = reservationCancellationSlice.actions
export default reservationCancellationSlice.reducer