"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOwnerReservations } from "@/features/owner-reservations/ownerReservationsSlice";
import { getOwnerSpots } from "@/features/owner/ownerSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  ArrowLeft,
  Search,
  Loader2,
  Star,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  format,
  subDays,
  subMonths,
  parseISO,
  differenceInHours,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { ParkingSpace, Reservation } from "@/types/type";
import { useRouter } from "next/navigation";

export default function OwnerDashboard() {
  const dispatch = useAppDispatch();
  const [timeRange, setTimeRange] = useState("7days");
  const [selectedSpot, setSelectedSpot] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");

  const { paidSpots, pendingSpots, loading, error } = useAppSelector(
    (state) => state.owner,
  );
  const {
    ownerReservations,
    loading: reservationsLoading,
    error: reservationsError,
  } = useAppSelector((state) => state.ownerReservations);

  const router = useRouter();

  useEffect(() => {
    dispatch(getOwnerSpots());
    dispatch(fetchOwnerReservations());
  }, [dispatch]);

  const dateRangeFilter = useMemo(() => {
    const now = new Date();
    const ranges = {
      "7days": { start: subDays(now, 7), groupBy: "day" },
      "30days": { start: subDays(now, 30), groupBy: "3days" },
      "1year": { start: subMonths(now, 12), groupBy: "month" },
    };
    //@ts-ignore
    return ranges[timeRange];
  }, [timeRange]);

  const filteredSpots = useMemo(() => {
    const allSpots = [...paidSpots, ...pendingSpots];
    if (!searchTerm) return allSpots;

    const search = searchTerm.toLowerCase();
    return allSpots.filter(
      (spot) =>
        spot.name?.toLowerCase().includes(search) ||
        spot.location.address?.toLowerCase().includes(search),
    );
  }, [paidSpots, pendingSpots, searchTerm]);

  const filteredReservations = useMemo(() => {
    return ownerReservations.filter((res: Reservation) => {
      const resDate = parseISO(res.created_at);
      const inDateRange = isAfter(resDate, dateRangeFilter.start);
      const forSelectedSpot =
        selectedSpot === "all" || res.parking_space_id === selectedSpot;
      return inDateRange && forSelectedSpot;
    });
  }, [ownerReservations, dateRangeFilter, selectedSpot]);

  const analytics = useMemo(() => {
    const activeReservations = filteredReservations.filter(
      (res: Reservation) => res.status === "active",
    );
    const completedReservations = filteredReservations.filter(
      (res: Reservation) => res.status === "completed",
    );
    const canceledReservations = filteredReservations.filter(
      (res: Reservation) => res.status === "canceled",
    );

    const totalRevenue = completedReservations.reduce(
      (sum: number, res: Reservation) => sum + res.price,
      0,
    );
    const totalHours = completedReservations.reduce(
      (sum: number, res: Reservation) =>
        sum +
        differenceInHours(parseISO(res.end_time), parseISO(res.start_time)),
      0,
    );

    return {
      totalBookings: filteredReservations.length,
      activeBookings: activeReservations.length,
      totalRevenue,
      avgBookingDuration: totalHours / (completedReservations.length || 1),
      cancelRate:
        (canceledReservations.length / filteredReservations.length) * 100,
      avgRating:
        paidSpots.reduce(
          (sum: number, spot: ParkingSpace) =>
            sum +
            (spot.avg_total_rating === "unrated"
              ? 0
              : Number(spot.avg_total_rating || 0)),
          0,
        ) /
        paidSpots.filter(
          (spot: ParkingSpace) => spot.avg_total_rating !== "unrated",
        ).length,
      occupancyRate:
        (completedReservations.length /
          paidSpots.reduce(
            (sum: number, spot: ParkingSpace) =>
              sum + (spot.availability_schedule?.length || 0),
            0,
          )) *
        100,
    };
  }, [filteredReservations, paidSpots]);

  const chartData = useMemo(() => {
    const grouped = filteredReservations.reduce(
      (acc: any, res: Reservation) => {
        const dateKey = format(
          parseISO(res.created_at),
          dateRangeFilter.groupBy === "month" ? "yyyy-MM" : "yyyy-MM-dd",
        );

        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            bookings: 0,
            revenue: 0,
            avgDuration: 0,
            totalHours: 0,
          };
        }

        const duration = differenceInHours(
          parseISO(res.end_time),
          parseISO(res.start_time),
        );
        acc[dateKey].bookings += 1;
        acc[dateKey].revenue += res.price;
        acc[dateKey].totalHours += duration;
        acc[dateKey].avgDuration =
          acc[dateKey].totalHours / acc[dateKey].bookings;

        return acc;
      },
      {},
    );

    return Object.entries(grouped)
      .map(([date, data]) => ({
        // @ts-ignore
        ...data,
        label: format(
          parseISO(date),
          dateRangeFilter.groupBy === "month" ? "MMM" : "MMM d",
        ),
        // @ts-ignore
      }))
      .sort((a: any, b: any) => new Date(a.date) - new Date(b.date));
  }, [filteredReservations, dateRangeFilter]);

  const upcomingEarnings = useMemo(() => {
    const now = new Date();
    return (
      ownerReservations
        .filter(
          (res: Reservation) =>
            (res.status === "active" || res.status === "booked") &&
            isAfter(parseISO(res.end_time), now),
        )
        .map((res: Reservation) => {
          const spot = paidSpots.find(
            (s: ParkingSpace) => s.id === res.parking_space_id,
          );
          const duration = differenceInHours(
            parseISO(res.end_time),
            parseISO(res.start_time),
          );
          return {
            spotName: spot?.name || "Unknown Spot",
            spotAddress: spot?.location.address,
            startDate: format(parseISO(res.start_time), "MMM d, yyyy"),
            startTime: format(parseISO(res.start_time), "h:mm a"),
            duration: `${duration}h`,
            earnings: res.price,
          };
        })
        // @ts-ignore
        .sort((a: any, b: any) => new Date(a.startDate) - new Date(b.startDate))
    );
  }, [ownerReservations, paidSpots]);

  const spotPerformance = useMemo(() => {
    return paidSpots.map((spot: ParkingSpace) => {
      const spotReservations = filteredReservations.filter(
        (res: Reservation) => res.parking_space_id === spot.id,
      );
      const completed = spotReservations.filter(
        (res: Reservation) => res.status === "completed",
      );
      const revenue = completed.reduce(
        (sum: number, res: Reservation) => sum + res.price,
        0,
      );
      const totalPossibleHours = spot.availability_schedule?.length
        ? spot.availability_schedule.length * 24
        : 1;
      const totalBookedHours = completed.reduce(
        (sum: number, res: Reservation) =>
          sum +
          differenceInHours(parseISO(res.end_time), parseISO(res.start_time)),
        0,
      );

      return {
        id: spot.id,
        name: spot.name,
        address: spot.location.address,
        bookings: spotReservations.length,
        revenue,
        occupancyRate: (totalBookedHours / totalPossibleHours) * 100,
        avgRating:
          spot.avg_total_rating === "unrated"
            ? "Not rated"
            : Number(spot.avg_total_rating).toFixed(1),
        ratingCount:
          (spot.ratings_count_availability || 0) +
          (spot.ratings_count_cleanliness || 0),
        basePrice: spot.pricing_info?.base_price || 0,
        verificationStatus: spot.verification_status,
      };
    });
  }, [paidSpots, filteredReservations]);

  if (loading || reservationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || reservationsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <p className="text-red-500">{error || reservationsError}</p>
          <Button
            onClick={() => {
              dispatch(getOwnerSpots());
              dispatch(fetchOwnerReservations());
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
          className="container mx-auto px-4 py-4"
        >
          <Button
            variant="ghost"
            className="absolute left-0 flex items-center text-gray-800"
            onClick={() => router.push("/myspots")}
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="flex flex-col justify-between items-center gap-2">
            <header className="relative flex items-center justify-center my-2">
              <div className="text-3xl font-bold text-slate-950">
                Your Reports
              </div>
            </header>
            <p className="text-sm text-gray-500">
              {paidSpots.length} spots • {analytics.totalBookings} total
              bookings
            </p>

            <div className="flex flex-wrap gap-2 items-center">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSpot} onValueChange={setSelectedSpot}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Select Spot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Spots</SelectItem>
                  {paidSpots.map((spot: ParkingSpace) => (
                    <SelectItem key={spot.id} value={spot.id as string}>
                      {spot.name || "Unnamed Spot"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search spots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                $
                {(
                  analytics.totalRevenue / filteredReservations.length || 0
                ).toFixed(2)}{" "}
                per booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Bookings
              </CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.activeBookings}
              </div>
              <p className="text-xs text-muted-foreground">
                {(
                  (analytics.activeBookings / analytics.totalBookings) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Duration
              </CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.avgBookingDuration.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">per booking</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Occupancy Rate
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.occupancyRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                of available time slots
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="spots">Spots</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="overview" className="space-y-4">
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Booking & Revenue Trends</CardTitle>
                    <CardDescription>
                      {timeRange === "7days"
                        ? "Daily"
                        : timeRange === "30days"
                          ? "3-Day"
                          : "Monthly"}{" "}
                      breakdown of bookings and revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke="#3b82f6"
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#10b981"
                          />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="bookings"
                            fill="#3b82f6"
                            name="Bookings"
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="revenue"
                            fill="#10b981"
                            name="Revenue ($)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Key statistics for your parking spots
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Cancellation Rate
                          </p>
                          <p className="text-xl font-bold">
                            {analytics.cancelRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Average Rating
                          </p>
                          <div className="flex items-center gap-1">
                            <p className="text-xl font-bold">
                              {analytics.avgRating.toFixed(1)}
                            </p>
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Active Spots
                          </p>
                          <p className="text-xl font-bold">
                            {paidSpots.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Pending Verification
                          </p>
                          <p className="text-xl font-bold">
                            {pendingSpots.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="earnings">
              <motion.div
                key="earnings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Earnings</CardTitle>
                    <CardDescription>
                      Expected revenue from confirmed bookings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingEarnings.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingEarnings.map((earning: any, index: any) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{earning.spotName}</p>
                              <p className="text-sm text-gray-500">
                                {earning.spotAddress}
                              </p>
                              <p className="text-sm text-gray-500">
                                {earning.startDate} at {earning.startTime} •{" "}
                                {earning.duration}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ${earning.earnings}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-green-800">
                              Total Upcoming Earnings
                            </p>
                            <p className="text-xl font-bold text-green-700">
                              $
                              {upcomingEarnings.reduce(
                                (sum: any, e: any) => sum + e.earnings,
                                0,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No upcoming bookings
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Spot</CardTitle>
                    <CardDescription>
                      Breakdown of earnings per parking spot
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {spotPerformance
                        .sort((a: any, b: any) => b.revenue - a.revenue)
                        .map((spot: ParkingSpace) => (
                          <div
                            key={spot.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{spot.name}</p>
                              <p className="text-sm text-gray-500">
                                {spot.location.address}
                              </p>
                              <p className="text-sm text-gray-500">
                                Unknown # bookings • $
                                {spot.pricing_info?.base_price}/hr
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                Unknown revenue
                              </p>
                              <p className="text-sm text-gray-500">
                                Unknown % occupied
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="spots">
              <motion.div
                key="spots"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {filteredSpots.map((spot) => {
                  const performance = spotPerformance.find(
                    (s: ParkingSpace) => s.id === spot.id,
                  );
                  return (
                    <Card key={spot.id} className="mb-4">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">
                              {spot.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {spot.location.address}
                            </p>
                            <div className="flex items-center gap-2">
                              {spot.verification_status === "verified" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Verified
                                </span>
                              )}
                              {spot.verification_status === "pending" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending Verification
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                                <Star className="w-4 h-4" />
                                {performance?.avgRating}
                                {performance?.ratingCount > 0 &&
                                  ` (${performance.ratingCount} reviews)`}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Revenue</p>
                              <p className="text-lg font-bold">
                                ${performance?.revenue || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Bookings</p>
                              <p className="text-lg font-bold">
                                {performance?.bookings || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">
                                Base Price
                              </p>
                              <p className="text-lg font-bold">
                                ${spot.pricing_info?.base_price}/hr
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Occupancy</p>
                              <p className="text-lg font-bold">
                                {performance?.occupancyRate.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </motion.div>
  );
}
