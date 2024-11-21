"use client"

import React, { useEffect } from "react"
import { motion } from "framer-motion"
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchOwnerReservations } from "@/features/owner-reservations/ownerReservationsSlice"
import { getOwnerSpots } from "@/features/owner/ownerSlice"
import { fetchDashboardAnalytics } from "@/features/dashboard-analytics/dashboardAnalyticsSlice"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileWarning } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import RevenueTab from "./components/RevenueTab"
import BookingsTab from "./components/BookingsTab"
import SpotsTab from "./components/SpotsTab"
import RatingsTab from "./components/RatingsTab"

const TIME_FILTERS = {
  "7_days": "Last 7 Days",
  "30_days": "Last 30 Days",
  "1_year": "Last Year",
} as const

// Loading Skeleton Components
const HeaderSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-32 bg-gray-200 rounded mx-auto" />
    <div className="h-4 w-48 bg-gray-200 rounded mx-auto" />
    <div className="flex justify-center gap-4 mt-4">
      <div className="w-48 h-10 bg-gray-200 rounded" />
      <div className="w-48 h-10 bg-gray-200 rounded" />
    </div>
  </div>
)

const SummaryCardSkeleton = () => (
  <div className="flex items-center space-x-2 animate-pulse">
    <div className="h-6 w-6 bg-gray-200 rounded" />
    <div>
      <div className="h-3 w-24 bg-gray-200 rounded" />
      <div className="h-6 w-32 bg-gray-200 rounded mt-1" />
    </div>
  </div>
)

const ChartSkeleton = () => (
  <div className="h-[400px] w-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-gray-400">Loading chart data...</div>
  </div>
)

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="rounded-lg border p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg border p-6">
        <ChartSkeleton />
      </div>
      <div className="rounded-lg border p-6">
        <ChartSkeleton />
      </div>
    </div>
  </div>
)

export default function OwnerDashboard() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams();
  const [timeFilter, setTimeFilter] =
    React.useState<keyof typeof TIME_FILTERS>("30_days")
  const querySpotId = searchParams.get("spotId");
  const queryTab = searchParams.get("tab");

  const [selectedTab, setSelectedTab] = React.useState(
      queryTab || "revenue"
  );
  const [selectedSpotId, setSelectedSpotId] = React.useState<string | null>(
      null
  );

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

  // Handle errors with toast notifications
  useEffect(() => {
    if (spotsError || reservationsError || analyticsError) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: spotsError || reservationsError || analyticsError,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dispatch(getOwnerSpots())
              dispatch(fetchOwnerReservations())
              dispatch(
                fetchDashboardAnalytics({
                  timeFilter,
                  spotId: selectedSpotId,
                }),
              )
            }}
          >
            Try Again
          </Button>
        ),
      })
    }
  }, [
    spotsError,
    reservationsError,
    analyticsError,
    dispatch,
    timeFilter,
    selectedSpotId,
    toast,
  ])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotId = params.get("spotId");
    const tab = params.get("tab");

    setSelectedSpotId(spotId);
    setSelectedTab(tab || "revenue");
  }, []);

  // Initial data fetch
  useEffect(() => {
    dispatch(getOwnerSpots())
    dispatch(fetchOwnerReservations())
    dispatch(
      fetchDashboardAnalytics({
        timeFilter,
        spotId: selectedSpotId,
      }),
    )
  }, [dispatch, timeFilter, selectedSpotId])

  const loading = spotsLoading || reservationsLoading || analyticsLoading

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
          className="container mx-auto px-4 py-4 relative"
        >
          <Button
            variant="ghost"
            className="absolute left-4 flex items-center text-gray-800"
            onClick={() => router.push("/myspots")}
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>

          <Button
            variant="ghost"
            className="absolute right-4 flex items-center text-gray-800"
            onClick={() => router.push("/reports")}
          >
            <FileWarning className="w-5 h-5 mr-1" />
            Report
          </Button>

          {loading ? (
            <HeaderSkeleton />
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold mt-6 text-slate-950">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  {paidSpots.length + pendingSpots.length} active spots •{" "}
                  {ownerReservations.length} total bookings
                </p>
              </div>
              <div className="mb-2 flex gap-4 mt-4 justify-center items-center text-slate-950">
                <div className="w-48">
                  <Select
                    value={timeFilter}
                    onValueChange={(value: keyof typeof TIME_FILTERS) =>
                      setTimeFilter(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIME_FILTERS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-48">
                  <Select
                    value={selectedSpotId || "all"}
                    onValueChange={(value) =>
                      setSelectedSpotId(value === "all" ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select spot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Spots</SelectItem>
                      {[...pendingSpots, ...paidSpots]
                        .sort((a, b) =>
                          a.name > b.name ? 1 : a.name < b.name ? -1 : 0,
                        )
                        .map((spot) => (
                          <SelectItem key={spot.id} value={spot.id}>
                            {spot.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="revenue"
              disabled={analyticsLoading || analyticsError}
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              disabled={analyticsLoading || analyticsError}
            >
              Bookings
            </TabsTrigger>
            <TabsTrigger
              value="spots"
              disabled={analyticsLoading || analyticsError}
            >
              Spots
            </TabsTrigger>
            <TabsTrigger
              value="ratings"
              disabled={analyticsLoading || analyticsError}
            >
              Ratings
            </TabsTrigger>
          </TabsList>

          {analyticsLoading || analyticsError ? (
            <DashboardSkeleton />
          ) : (
            analytics && (
              <>
                <TabsContent value="revenue">
                  <RevenueTab
                    revenueMetrics={analytics.revenueMetrics}
                    timeFilter={timeFilter}
                  />
                </TabsContent>

                <TabsContent value="bookings">
                  <BookingsTab bookingMetrics={analytics.bookingMetrics} />
                </TabsContent>

                <TabsContent value="spots">
                  <SpotsTab
                    paidSpots={paidSpots}
                    pendingSpots={pendingSpots}
                    spotPerformance={analytics.spotPerformance}
                    avgRating={analytics.ratingMetrics.averageRatings.total}
                    numReviews={analytics.ratingMetrics.totalRatings}
                    selectedSpotId={selectedSpotId}
                  />
                </TabsContent>

                <TabsContent value="ratings">
                  <RatingsTab ratingMetrics={analytics.ratingMetrics} />
                </TabsContent>
              </>
            )
          )}
        </Tabs>
      </div>
    </motion.div>
  )
}
