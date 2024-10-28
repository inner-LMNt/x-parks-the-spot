// src/features/reports/reportsSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { Report, ReportCreateRequest } from "@/types/type";

// Define the state interface
interface ReportsState {
    loading: boolean;
    error: string | null;
    reports: Report[];
}

// Initial state
const initialState: ReportsState = {
    loading: false,
    error: null,
    reports: [],
};

// Async thunk to fetch user reports
export const fetchUserReports = createAsyncThunk<
    Report[],
    void,
    { rejectValue: string }
>("reports/fetchUserReports", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get<Report[]>("/reports");
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || "Failed to fetch reports");
    }
});

// Async thunk to submit a new report
export const submitReport = createAsyncThunk<
    Report,
    ReportCreateRequest,
    { rejectValue: string }
>("reports/submitReport", async (newReport, { rejectWithValue }) => {
    try {
        const response = await axios.post<Report>("/reports", newReport);
        return response.data;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || "Failed to submit report");
    }
});

const reportsSlice = createSlice({
    name: "reports",
    initialState,
    reducers: {
        resetReportsError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Reports
            .addCase(fetchUserReports.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserReports.fulfilled, (state, action: PayloadAction<Report[]>) => {
                state.loading = false;
                state.reports = action.payload;
            })
            .addCase(fetchUserReports.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || "Failed to fetch reports";
            })
            // Submit Report
            .addCase(submitReport.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(submitReport.fulfilled, (state, action: PayloadAction<Report>) => {
                state.loading = false;
                state.reports.unshift(action.payload); // Add new report to the beginning
            })
            .addCase(submitReport.rejected, (state, action) => {
                state.loading = false;
                state.error = "Failed to submit report";
            });
    },
});

export const { resetReportsError } = reportsSlice.actions;
export default reportsSlice.reducer;
