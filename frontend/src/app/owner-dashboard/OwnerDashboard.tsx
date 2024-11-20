"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchOwnerReservations } from "@/features/owner-reservations/ownerReservationsSlice"
import { getOwnerSpots } from "@/features/owner/ownerSlice"
import { fetchDashboardAnalytics } from "@/features/dashboard-analytics/dashboardAnalyticsSlice"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import MetricsTab from "./components/MetricsTab"
import RevenueTab from "./components/RevenueTab"
import BookingsTab from "./components/BookingsTab"
import SpotsTab from "./components/SpotsTab"
import RatingsTab from "./components/RatingsTab"

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
        day: string
        bookings: number
      }>
    }
    bookings: {
      active: number
      total: number
      percentageActive: number
    }
    ratings: {
      average: number
      totalSpots: number
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
      startTime: string
      endTime: string
      status: "active" | "completed" | "canceled"
      price: number
      duration: number
      carDetails: {
        make: string
        model: string
        year: number
        color: string
      }
    }>
    bookingsByStatus: {
      active: Array<any>
      completed: Array<any>
      canceled: Array<any>
    }
  }
  spotPerformance: Record<
    string,
    {
      totalRevenue: number
      totalBookings: number
      occupancyRate: number
      averageBookingLength: number
      repeatBookers: number
      activeBookings: number
      completedBookings: number
      canceledBookings: number
      popularHours: Array<{ hour: number; bookings: number }>
      popularDays: Array<{ day: string; bookings: number }>
    }
  >
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
      totalRating: number | "unrated"
      ratingCount: number
      ratingDistribution: Array<{
        stars: number
        count: number
        percentage: number
      }>
      recentReviews: Array<{
        rating: number
        daysAgo: number
        comment: string
        isVerified: boolean
      }>
      responseMetrics: {
        averageResponseTime: number
        issueResolutionRate: number
        ratingTrend: number
      }
    }>
    performanceMetrics: {
      responseRate: number
      ratingImprovement: number
      customerReturnRate: number
    }
  }
}

export default function OwnerDashboard() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState("metrics")

  const {
    paidSpots,
    pendingSpots,
    loading: spotsLoading,
    error: spotsError,
  } = useAppSelector((state) => state.owner)
  const {
    ownerReservations,
    loading: reservationsLoading,
    error: reservationsError,
  } = useAppSelector((state) => state.ownerReservations)
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAppSelector((state) => state.dashboardAnalytics)

  // Fetch initial data
  useEffect(() => {
    dispatch(getOwnerSpots())
    dispatch(fetchOwnerReservations())
  }, [dispatch])

  // Fetch analytics when spots and reservations are loaded
  useEffect(() => {
    if (paidSpots.length > 0 && ownerReservations.length > 0) {
      dispatch(fetchDashboardAnalytics(null))
    }
  }, [paidSpots, ownerReservations, dispatch])

  const loading = spotsLoading || reservationsLoading || analyticsLoading
  const error = spotsError || reservationsError || analyticsError

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading dashboard data...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <p className="text-red-500">{error}</p>
          <Button
            onClick={() => {
              dispatch(getOwnerSpots())
              dispatch(fetchOwnerReservations())
              dispatch(fetchDashboardAnalytics(null))
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="container mx-auto px-4 py-4"
        >
          <Button
            variant="ghost"
            className="absolute left-4 flex items-center text-gray-800"
            onClick={() => router.push("/myspots")}
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold mt-6 text-slate-950">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              {paidSpots.length} active spots • {ownerReservations.length} total
              bookings
            </p>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="spots">Spots</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {analytics && (
              <>
                <TabsContent value="metrics">
                  <MetricsTab overallMetrics={analytics.overallMetrics} />
                </TabsContent>

                <TabsContent value="revenue">
                  <RevenueTab revenueMetrics={analytics.revenueMetrics} />
                </TabsContent>

                <TabsContent value="bookings">
                  <BookingsTab bookingMetrics={analytics.bookingMetrics} />
                </TabsContent>

                <TabsContent value="spots">
                  <SpotsTab
                    paidSpots={paidSpots}
                    pendingSpots={pendingSpots}
                    spotPerformance={analytics.spotPerformance}
                  />
                </TabsContent>

                <TabsContent value="ratings">
                  <RatingsTab
                    spots={paidSpots}
                    ratingMetrics={analytics.ratingMetrics}
                  />
                </TabsContent>
              </>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </motion.div>
  )
}
