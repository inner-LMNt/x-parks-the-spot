// src/features/reports/reportDetailsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '@/api/axiosInstance';
import { Report } from '@/types/type';

interface ReportDetailsState {
    loading: boolean;
    error: string | null;
    data: Report | null;
}

const initialState: ReportDetailsState = {
    loading: false,
    error: null,
    data: null,
};

export const fetchReportDetails = createAsyncThunk<
    Report,
    string,
    { rejectValue: string }
>('reportDetails/fetchReportDetails', async (reportId, { rejectWithValue }) => {
    try {
        const response = await axios.get<Report>(`/reports/${reportId}`);
        return response.data;
    } catch (error: any) {
        return rejectWithValue(
            error.response?.data?.error || 'Failed to fetch report details'
        );
    }
});

const reportDetailsSlice = createSlice({
    name: 'reportDetails',
    initialState,
    reducers: {
        resetReportDetails(state) {
            state.data = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchReportDetails.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReportDetails.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchReportDetails.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch report details';
            });
    },
});

export const { resetReportDetails } = reportDetailsSlice.actions;
export default reportDetailsSlice.reducer;
