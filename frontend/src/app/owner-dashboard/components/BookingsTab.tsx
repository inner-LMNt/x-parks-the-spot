"use client"

import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import BookingDetailCard from "./BookingDetailCard"

interface BookingStats {
  total: number
  active: number
  completed: number
  canceled: number
  avgDuration: number
  completionRate: number
}

interface BookingDetails {
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
}

interface BookingMetrics {
  stats: BookingStats
  recentBookings: BookingDetails[]
}

interface BookingsTabProps {
  bookingMetrics: BookingMetrics
}

export default function BookingsTab({ bookingMetrics }: BookingsTabProps) {
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(
    null,
  )

  const [statusFilter, setStatusFilter] = useState<
    "all" | "upcoming" | "current" | "past" | "canceled"
  >("all")

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") {
      return bookingMetrics.recentBookings
    }
    if (statusFilter === "canceled") {
      return bookingMetrics.recentBookings.filter(
        (booking) => booking.status === "canceled",
      )
    }
    return bookingMetrics.recentBookings.filter(
      (booking) =>
        booking.status !== "canceled" && booking.time_status === statusFilter,
    )
  }, [statusFilter, bookingMetrics.recentBookings])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {selectedBooking && (
        <BookingDetailCard
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          booking={selectedBooking}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-950">Bookings Overview</h2>
        {/* @ts-ignore */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] text-slate-950">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="past">Past</SelectItem>
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
                  <TableHead>Details</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className={`${booking.time_status === "current" ? "bg-blue-50" : ""} cursor-pointer hover:bg-gray-50`}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {booking.spotName || "Unnamed Spot"}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          {booking.renterName || "Anonymous"}
                          {booking.rentalCount > 1 && (
                            <span className="text-xs px-1 bg-gray-100 rounded">
                              {booking.rentalCount}x
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {[
                            booking.carDetails.make,
                            booking.carDetails.model,
                            booking.carDetails.plate,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm">
                          {format(parseISO(booking.startTime), "MMM d, h:mma")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.isMultiDay
                            ? `${booking.daysDuration}d`
                            : `${Number(booking.duration).toFixed(1)}h`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${booking.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "canceled"
                            ? "destructive"
                            : booking.time_status === "upcoming"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {booking.status === "canceled"
                          ? "Canceled"
                          : booking.time_status.charAt(0).toUpperCase() +
                            booking.time_status.slice(1)}
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
  )
}
