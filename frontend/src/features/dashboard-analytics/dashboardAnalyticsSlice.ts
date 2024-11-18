import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "@/api/axiosInstance"

export interface FetchReservationsParams {
  timeFilter?: "7_days" | "30_days" | "1_year"
  spotId?: string | null
}

export interface DashboardAnalytics {
  overallMetrics: {
    revenue: {
      total: number
      perBooking: number
      trends: Array<{
        date: string
        revenue: number
      }>
    }
    occupancy: {
      overallRate: number
      popularTimes: Array<{
        hour: number
        bookings: number
      }>
    }
    bookings: {
      total: number
      active: number
      percentageActive: number
    }
  }
  revenueMetrics: {
    monthlyRevenue: Array<{
      month: string
      revenue: number
      bookings: number
    }>
    dailyRevenue: Array<{
      date: string
      revenue: number
    }>
    hourlyRevenue: Array<{
      hour: number
      revenue: number
    }>
    revenueBySpot: Array<{
      spotId: string
      spotName: string
      revenue: number
      bookings: number
      occupancyRate: number
      basePrice: number
    }>
  }
  bookingMetrics: {
    stats: {
      total: number
      active: number
      completed: number
      canceled: number
      avgDuration: number
      completionRate: number
    }
    recentBookings: Array<{
      id: string
      spotId: string
      spotName: string
      renterName: string
      renterEmail: string
      startTime: string
      endTime: string
      status: "booked" | "current" | "completed" | "canceled"
      price: number
      duration: number
      time_status: "upcoming" | "current" | "past"
      isMultiDay: boolean
      daysDuration: number
      rentalCount: number
      carDetails: {
        make: string
        model: string
        color: string
        plate: string
      }
    }>
  }
  spotPerformance: Record<
    string,
    {
      totalRevenue: number
      totalBookings: number
      occupancyRate: number
      averageBookingLength: number
      activeBookings: number
      completedBookings: number
      canceledBookings: number
      popularHours: Array<{ hour: number; bookings: number }>
      popularDays: Array<{ day: string; bookings: number }>
    }
  >
  upcomingEarnings: {
    total: number
    reservations: Array<{
      spotName: string
      startTime: string
      endTime: string
      earnings: number
    }>
  }
  ratingMetrics: {
    averageRatings: {
      availability: number
      cleanliness: number
      total: number
    }
    totalRatings: number
    ratingsBySpot: Array<{
      spotId: string
      spotName: string
      availabilityRating: number
      cleanlinessRating: number
      totalRating: number
      ratingCount: number
      ratingDistribution: Array<{
        stars: number
        count: number
        percentage: number
      }>
      recentReviews: Array<{
        rating: number
        daysAgo: number
        isVerified: boolean
      }>
    }>
  }
}

interface DashboardAnalyticsState {
  analytics: DashboardAnalytics | null
  loading: boolean
  error: string | null
}

const initialState: DashboardAnalyticsState = {
  analytics: null,
  loading: false,
  error: null,
}

// Fetch all dashboard analytics in a single call
export const fetchDashboardAnalytics = createAsyncThunk(
  "dashboardAnalytics/fetchDashboardAnalytics",
  async (
    {
      timeFilter = "30_days",
      spotId = null,
    }: { timeFilter?: string; spotId?: string | null } = {},
    { rejectWithValue },
  ) => {
    try {
      const params = new URLSearchParams()
      params.append("time_filter", timeFilter)
      if (spotId) {
        params.append("spot_id", spotId)
      }
      const response = await axios.get<DashboardAnalytics>(
        `/analytics/dashboard?${params.toString()}`,
      )
      const data = response.data

      console.log("Fetched Dashboard Analytics:", data)

      // Transform 'upcomingEarnings.reservations' if necessary
      if (data.upcomingEarnings && data.upcomingEarnings.reservations) {
        data.upcomingEarnings.reservations =
          data.upcomingEarnings.reservations.map((reservation) => ({
            spotName: reservation.spotName,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            earnings: reservation.earnings,
          }))
      }

      return data
    } catch (error: any) {
      console.error("Error fetching dashboard analytics:", error)
      return rejectWithValue(
        error.response?.data?.err || "Failed to fetch dashboard analytics",
      )
    }
  },
)

const dashboardAnalyticsSlice = createSlice({
  name: "dashboardAnalytics",
  initialState,
  reducers: {
    resetAnalyticsError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
        state.loading = false
        state.analytics = action.payload
        state.error = null
      })
      .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { resetAnalyticsError } = dashboardAnalyticsSlice.actions
export default dashboardAnalyticsSlice.reducer
