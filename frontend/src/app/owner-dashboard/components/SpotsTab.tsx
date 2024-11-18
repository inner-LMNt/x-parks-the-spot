"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParkingSpace } from "@/types/type";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Clock, MapPin, ShieldCheck, Star } from "lucide-react";

interface SpotPerformance {
  totalRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  averageBookingLength: number;
  activeBookings: number;
  completedBookings: number;
  canceledBookings: number;
  popularHours: Array<{ hour: number; bookings: number }>;
  popularDays: Array<{ day: string; bookings: number }>;
}

interface SpotsTabProps {
  paidSpots: ParkingSpace[];
  pendingSpots: ParkingSpace[];
  spotPerformance: Record<string, SpotPerformance>;
  avgRating: number;
  numReviews: number;
}

const WEEKDAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function SpotsTab({
                                   paidSpots,
                                   pendingSpots,
                                   spotPerformance,
                                   avgRating,
                                   numReviews,
                                 }: SpotsTabProps) {
  const verifiedSpots = useMemo(
      () => paidSpots.filter((spot) => spot.verification_status === "verified"),
      [paidSpots]
  );

  const spotsWithPerformance = useMemo(
      () =>
          paidSpots
              .filter((spot) => spotPerformance[spot.id])
              .map((spot) => ({
                ...spot,
                performance: spotPerformance[spot.id],
              })),
      [paidSpots, spotPerformance]
  );

  // Helper function to format hours
  const formatHour = (hour: number) => {
    const formattedHour = hour.toString().padStart(2, "0");
    return `${formattedHour}:00`;
  };

  // Helper function to sort days
  const sortDays = (days: Array<{ day: string; bookings: number }>) => {
    const dayMap: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };
    return days.sort(
        (a, b) => (dayMap[a.day] || 8) - (dayMap[b.day] || 8)
    );
  };

  return (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Verified Spots */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Verified Spots
              </CardTitle>
              <ShieldCheck className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedSpots.length}</div>
              <p className="text-xs text-muted-foreground">
                {paidSpots.length > 0
                    ? ((verifiedSpots.length / paidSpots.length) * 100).toFixed(0)
                    : 0}
                % of total spots
              </p>
            </CardContent>
          </Card>

          {/* Pending Verification */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Verification
              </CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSpots.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rating
              </CardTitle>
              <Star className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgRating.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                {numReviews} review{numReviews !== 1 && "s"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Spot Performance Cards */}
        {spotsWithPerformance.map((spot) => {
          // Prepare formatted popular hours
          const formattedPopularHours = useMemo(() => {
            // Ensure all 24 hours are present
            const hoursMap: Record<number, number> = {};
            spot.performance.popularHours.forEach(({ hour, bookings }) => {
              hoursMap[hour] = bookings;
            });
            const completeHours = Array.from({ length: 24 }, (_, i) => ({
              hour: formatHour(i),
              bookings: hoursMap[i] || 0,
            }));
            return completeHours;
          }, [spot.performance.popularHours]);

          // Prepare sorted popular days
          const sortedPopularDays = useMemo(() => {
            const sorted = sortDays(spot.performance.popularDays);
            // Ensure all weekdays are present
            const daysMap: Record<string, number> = {};
            sorted.forEach(({ day, bookings }) => {
              daysMap[day] = bookings;
            });
            const completeDays = WEEKDAYS_ORDER.map((day) => ({
              day,
              bookings: daysMap[day] || 0,
            }));
            return completeDays;
          }, [spot.performance.popularDays]);

          return (
              <Card key={spot.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{spot.name || "Unnamed Spot"}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {spot.location.address}
                      </CardDescription>
                    </div>
                    <Badge
                        variant={
                          spot.verification_status === "verified"
                              ? "default"
                              : spot.verification_status === "pending"
                                  ? "secondary"
                                  : "destructive"
                        }
                    >
                      {spot.verification_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hourly Occupancy Chart */}
                    <div>
                      <h4 className="text-sm font-semibold mb-4">Hourly Occupancy</h4>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={formattedPopularHours}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="hour"
                                label={{
                                  value: "Hour of Day",
                                  position: "insideBottomRight",
                                  offset: -5,
                                  fontSize: 12,
                                }}
                            />
                            <YAxis
                                label={{
                                  value: "Bookings",
                                  angle: -90,
                                  position: "insideLeft",
                                  offset: 10,
                                  fontSize: 12,
                                }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value} bookings`, "Bookings"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="bookings"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Popular Days Chart */}
                    <div>
                      <h4 className="text-sm font-semibold mb-4">Popular Days</h4>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sortedPopularDays}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="day"
                                label={{
                                  value: "Day of Week",
                                  position: "insideBottomRight",
                                  offset: -5,
                                  fontSize: 12,
                                }}
                            />
                            <YAxis
                                label={{
                                  value: "Bookings",
                                  angle: -90,
                                  position: "insideLeft",
                                  offset: 10,
                                  fontSize: 12,
                                }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value} bookings`, "Bookings"]}
                            />
                            <Bar dataKey="bookings" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-lg font-bold">
                        ${Number(spot.performance.totalRevenue).toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Occupancy Rate</p>
                      <p className="text-lg font-bold">
                        {Number(spot.performance.occupancyRate).toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Avg Booking Length</p>
                      <p className="text-lg font-bold">
                        {Number(spot.performance.averageBookingLength).toFixed(1)}hrs
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Active Bookings</p>
                      <p className="text-lg font-bold">
                        {spot.performance.activeBookings}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          );
        })}
      </motion.div>
  );
}