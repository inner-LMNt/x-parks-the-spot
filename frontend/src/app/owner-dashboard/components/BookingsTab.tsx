"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface BookingStats {
  total: number;
  active: number;
  completed: number;
  canceled: number;
  avgDuration: number;
  completionRate: number;
}

interface CarDetails {
  make: string;
  model: string;
  color: string;
}

interface BookingDetails {
  id: string;
  spotId: string;
  spotName: string;
  renterName: string;
  startTime: string;
  endTime: string;
  status: "active" | "completed" | "canceled";
  price: number;
  duration: number;
  carDetails: CarDetails;
}

interface BookingMetrics {
  stats: BookingStats;
  recentBookings: BookingDetails[];
}

interface BookingsTabProps {
  bookingMetrics: BookingMetrics;
}

export default function BookingsTab({ bookingMetrics }: BookingsTabProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed" | "canceled"
  >("all");

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") {
      return bookingMetrics.recentBookings;
    }
    return bookingMetrics.recentBookings.filter(
      (booking) => booking.status === statusFilter,
    );
  }, [statusFilter, bookingMetrics.recentBookings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-950">Bookings Overview</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] text-slate-950">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookingMetrics.stats.total}
            </div>
          </CardContent>
        </Card>

        {/* Active Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookingMetrics.stats.active}
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(bookingMetrics.stats.completionRate).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(bookingMetrics.stats.avgDuration).toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>
            Showing {filteredBookings.length} booking
            {filteredBookings.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <p className="text-gray-500">
              No bookings match the selected status.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spot</TableHead>
                  <TableHead>Renter</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.spotName || "Unnamed Spot"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{booking.renterName || "Anonymous"}</div>
                        <div className="text-xs text-gray-500">
                          {booking.carDetails.make} {booking.carDetails.model}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.startTime ?? new Date()), "PPP")}
                    </TableCell>
                    <TableCell>
                      {Number(booking.duration).toFixed(1)}hrs
                    </TableCell>
                    <TableCell>${booking.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "completed"
                            ? "default"
                            : booking.status === "active"
                              ? "success"
                              : "destructive"
                        }
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
