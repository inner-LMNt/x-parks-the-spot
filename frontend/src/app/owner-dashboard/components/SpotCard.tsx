"use client"

import React, { useMemo } from "react"
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
} from "recharts"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import {ParkingSpace} from "@/types/type";

interface SpotPerformance {
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

interface SpotCardProps {
    spot: ParkingSpace & { performance: SpotPerformance }
    formatHour: (hour: number) => string
    WEEKDAYS_ORDER: string[]
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, formatHour, WEEKDAYS_ORDER }) => {
    const formattedPopularHours = useMemo(() => {
        const hoursMap: Record<number, number> = {}
        spot.performance.popularHours.forEach(({ hour, bookings }) => {
            hoursMap[hour] = (hoursMap[hour] || 0) + bookings
        })
        return Array.from({ length: 24 }, (_, i) => ({
            hour: formatHour(i),
            reservations: hoursMap[i] || 0,
        }))
    }, [spot.performance.popularHours, formatHour])

    const sortedPopularDays = useMemo(() => {
        const daysMap: Record<string, number> = {}
        spot.performance.popularDays.forEach(({ day, bookings }) => {
            daysMap[day] = (daysMap[day] || 0) + bookings
        })
        return WEEKDAYS_ORDER.map((day) => ({
            day,
            reservations: daysMap[day] || 0,
        }))
    }, [spot.performance.popularDays, WEEKDAYS_ORDER])

    return (
        <Card className="overflow-hidden">
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
                        className="absolute top-4 right-4"
                    >
                        {spot.verification_status || "unknown"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hourly Reservations Chart */}
                    <div>
                        <h4 className="text-sm font-semibold mb-4">
                            Hourly Reservations
                        </h4>
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
                                            value: "Reservations",
                                            angle: -90,
                                            position: "insideLeft",
                                            offset: 10,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [
                                            `${value} reservations`,
                                            "Reservations",
                                        ]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="reservations"
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
                                            value: "Reservations",
                                            angle: -90,
                                            position: "insideLeft",
                                            offset: 10,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [
                                            `${value} reservations`,
                                            "Reservations",
                                        ]}
                                    />
                                    <Bar dataKey="reservations" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
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
                            {Number(spot.performance.averageBookingLength).toFixed(1)}
                            hrs
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
    )
}

export default SpotCard
