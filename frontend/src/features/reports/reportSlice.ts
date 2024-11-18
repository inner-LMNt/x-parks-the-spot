// src/features/reports/reportActions.ts

import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "@/api/axiosInstance";
import { Report } from "@/types/type";

interface ReportsState {
  reports: Report[];
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  reports: [],
  loading: false,
  error: null,
};

export const fetchUserReports = createAsyncThunk<
  Report[],
  void,
  { rejectValue: string }
>("reports/fetchUserReports", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/reports");
    return response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to fetch reports",
    );
  }
});

// Submit Reservation Issue Report
export const submitReservationIssueReport = createAsyncThunk<
  Report,
  FormData,
  { rejectValue: string }
>(
  "reports/submitReservationIssueReport",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/reports/reservation-issue", formData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to submit reservation issue report",
      );
    }
  },
);

// Submit Renter Overstay Report
export const submitRenterOverstayReport = createAsyncThunk<
  Report,
  FormData,
  { rejectValue: string }
>(
  "reports/submitRenterOverstayReport",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/reports/renter-overstay", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to submit renter overstay report",
      );
    }
  },
);

// Submit Damage Report
export const submitDamageReport = createAsyncThunk<
  Report,
  FormData,
  { rejectValue: string }
>("reports/submitDamageReport", async (formData, { rejectWithValue }) => {
  try {
    const response = await axios.post("/reports/damage-report", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to submit damage report",
    );
  }
});

// Submit Other Issue Report
export const submitOtherIssueReport = createAsyncThunk<
  Report,
  FormData,
  { rejectValue: string }
>("reports/submitOtherIssueReport", async (formData, { rejectWithValue }) => {
  try {
    const response = await axios.post("/reports/other-issue", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to submit other issue report",
    );
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
      // Fetch User Reports
      .addCase(fetchUserReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchUserReports.fulfilled,
        (state, action: PayloadAction<Report[]>) => {
          state.loading = false;
          state.reports = action.payload;
        },
      )
      .addCase(fetchUserReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Submit Reservation Issue Report
      .addCase(submitReservationIssueReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        submitReservationIssueReport.fulfilled,
        (state, action: PayloadAction<Report>) => {
          state.loading = false;
          state.reports.unshift(action.payload);
        },
      )
      .addCase(submitReservationIssueReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Submit Renter Overstay Report
      .addCase(submitRenterOverstayReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        submitRenterOverstayReport.fulfilled,
        (state, action: PayloadAction<Report>) => {
          state.loading = false;
          state.reports.unshift(action.payload);
        },
      )
      .addCase(submitRenterOverstayReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Submit Damage Report
      .addCase(submitDamageReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        submitDamageReport.fulfilled,
        (state, action: PayloadAction<Report>) => {
          state.loading = false;
          state.reports.unshift(action.payload);
        },
      )
      .addCase(submitDamageReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Submit Other Issue Report
      .addCase(submitOtherIssueReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        submitOtherIssueReport.fulfilled,
        (state, action: PayloadAction<Report>) => {
          state.loading = false;
          state.reports.unshift(action.payload);
        },
      )
      .addCase(submitOtherIssueReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetReportsError } = reportsSlice.actions;
export default reportsSlice.reducer;
