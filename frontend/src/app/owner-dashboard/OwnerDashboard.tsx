"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOwnerReservations } from "@/features/owner-reservations/ownerReservationsSlice";
import { getOwnerSpots } from "@/features/owner/ownerSlice";
import { fetchDashboardAnalytics } from "@/features/dashboard-analytics/dashboardAnalyticsSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RevenueTab from "./components/RevenueTab";
import BookingsTab from "./components/BookingsTab";
import SpotsTab from "./components/SpotsTab";
import RatingsTab from "./components/RatingsTab";

const TIME_FILTERS = {
  "7_days": "Last 7 Days",
  "30_days": "Last 30 Days",
  "1_year": "Last Year",
} as const;

export default function OwnerDashboard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("revenue");
  const [timeFilter, setTimeFilter] =
    useState<keyof typeof TIME_FILTERS>("30_days");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const {
    paidSpots,
    pendingSpots,
    loading: spotsLoading,
    error: spotsError,
  } = useAppSelector((state) => state.owner);
  const {
    ownerReservations,
    loading: reservationsLoading,
    error: reservationsError,
  } = useAppSelector((state) => state.ownerReservations);
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAppSelector((state) => state.dashboardAnalytics);

  // Fetch initial data with filters
  useEffect(() => {
    dispatch(getOwnerSpots());
    dispatch(fetchOwnerReservations());
    dispatch(
      fetchDashboardAnalytics({
        timeFilter,
        spotId: selectedSpotId,
      }),
    );
  }, [dispatch, timeFilter, selectedSpotId]);

  const loading = spotsLoading || reservationsLoading || analyticsLoading;
  const error = spotsError || reservationsError || analyticsError;

  const FilterControls = () => (
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
            {paidSpots.map((spot) => (
              <SelectItem key={spot.id} value={spot.id}>
                {spot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

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
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <p className="text-red-500">{error}</p>
          <Button
            onClick={() => {
              dispatch(getOwnerSpots());
              dispatch(fetchOwnerReservations());
              dispatch(
                fetchDashboardAnalytics({
                  timeFilter,
                  spotId: selectedSpotId,
                }),
              );
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
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
          <div className="text-center">
            <h1 className="text-2xl font-bold mt-6 text-slate-950">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              {paidSpots.length} active spots • {ownerReservations.length} total
              bookings
            </p>
          </div>
          <FilterControls />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="spots">Spots</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
          </TabsList>

          {analytics && (
            <>
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
                  avgRating={analytics.ratingMetrics.averageRatings.total}
                  numReviews={analytics.ratingMetrics.totalRatings}
                />
              </TabsContent>

              <TabsContent value="ratings">
                <RatingsTab ratingMetrics={analytics.ratingMetrics} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </motion.div>
  );
}
