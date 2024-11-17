import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from "@/api/axiosInstance";

interface DashboardAnalytics {
    overallMetrics: {
        revenue: {
            total: number;
            perBooking: number;
            trends: Array<{
                date: string; // Month and Year
                revenue: number;
            }>;
        };
        occupancy: {
            overallRate: number;
            popularTimes: Array<{
                hour: number;
                bookings: number;
            }>;
        };
        bookings: {
            active: number;
            total: number;
            percentageActive: number;
        };
    };
    revenueMetrics: {
        monthlyRevenue: Array<{
            month: string;
            revenue: number;
            bookings: number;
        }>;
        dailyRevenue: Array<{
            date: string;
            revenue: number;
        }>;
        hourlyRevenue: Array<{
            hour: number;
            revenue: number;
        }>;
        revenueBySpot: Array<{
            spotId: string;
            spotName: string;
            revenue: number;
            bookings: number;
            occupancyRate: number;
            basePrice: number;
        }>;
    };
    bookingMetrics: {
        stats: {
            total: number;
            active: number;
            completed: number;
            canceled: number;
            avgDuration: number;
            completionRate: number;
        };
        recentBookings: Array<{
            id: string;
            spotId: string;
            spotName: string;
            renterName: string;
            startTime: string;
            endTime: string;
            status: 'active' | 'completed' | 'canceled';
            price: number;
            duration: number;
            carDetails: {
                make: string;
                model: string;
                year: number;
                color: string;
            };
        }>;
    };
    spotPerformance: Record<string, {
        totalRevenue: number;
        totalBookings: number;
        occupancyRate: number;
        averageBookingLength: number;
        activeBookings: number;
        completedBookings: number;
        canceledBookings: number;
        popularHours: Array<{ hour: number; bookings: number }>;
        popularDays: Array<{ day: string; bookings: number }>;
    }>;
    upcomingEarnings: {
        total: number;
        reservations: Array<{
            spot_name: string;
            start_time: string;
            end_time: string;
            earnings: number;
        }>;
    };
}


interface DashboardAnalyticsState {
    analytics: DashboardAnalytics | null;
    loading: boolean;
    error: string | null;
}

const initialState: DashboardAnalyticsState = {
    analytics: null,
    loading: false,
    error: null,
};

// Fetch all dashboard analytics in a single call
export const fetchDashboardAnalytics = createAsyncThunk(
    'dashboardAnalytics/fetchDashboardAnalytics',
    async ({ timeFilter = '30_days', spotId = null }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            params.append('time_filter', timeFilter);
            if (spotId) {
                params.append('spot_id', spotId);
            }
            const response = await axios.get(`/analytics/dashboard?${params.toString()}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard analytics');
        }
    }
);

const dashboardAnalyticsSlice = createSlice({
    name: 'dashboardAnalytics',
    initialState,
    reducers: {
        resetAnalyticsError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardAnalytics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
                state.loading = false;
                state.analytics = action.payload;
                state.error = null;
            })
            .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { resetAnalyticsError } = dashboardAnalyticsSlice.actions;
export default dashboardAnalyticsSlice.reducer;