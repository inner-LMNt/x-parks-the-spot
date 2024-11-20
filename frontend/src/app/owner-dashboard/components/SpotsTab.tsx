"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ParkingSpace } from "@/types/type"
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
import { MapPin, ShieldCheck, Star, Clock } from "lucide-react"
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion" // Adjust based on your UI library

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

interface SpotsTabProps {
    paidSpots: ParkingSpace[]
    pendingSpots: ParkingSpace[]
    spotPerformance: Record<string, SpotPerformance>
    avgRating: number
    numReviews: number
}

const WEEKDAYS_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

// SpotCard Subcomponent
const SpotCard: React.FC<{
    spot: ParkingSpace & { performance: SpotPerformance }
    formatHour: (hour: number) => string
    sortDays: (
        days: Array<{ day: string; bookings: number }>
    ) => Array<{ day: string; bookings: number }>
    WEEKDAYS_ORDER: string[]
}> = ({ spot, formatHour, sortDays, WEEKDAYS_ORDER }) => {
    // Prepare formatted popular hours
    const formattedPopularHours = useMemo(() => {
        const hoursMap: Record<number, number> = {}
        spot.performance.popularHours.forEach(({ hour, bookings }) => {
            hoursMap[hour] = (hoursMap[hour] || 0) + bookings
        })
        const completeHours = Array.from({ length: 24 }, (_, i) => ({
            hour: formatHour(i),
            bookings: hoursMap[i] || 0,
        }))
        return completeHours
    }, [spot.performance.popularHours, formatHour])

    // Prepare sorted popular days
    const sortedPopularDays = useMemo(() => {
        const daysMap: Record<string, number> = {}
        spot.performance.popularDays.forEach(({ day, bookings }) => {
            daysMap[day] = (daysMap[day] || 0) + bookings
        })
        const completeDays = WEEKDAYS_ORDER.map((day) => ({
            day,
            bookings: daysMap[day] || 0,
        }))
        return completeDays
    }, [spot.performance.popularDays, WEEKDAYS_ORDER])

    return (
        <Card className="p-4">
            <CardHeader>
                <CardTitle>Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hourly Bookings Chart */}
                    <div>
                        <h4 className="text-sm font-semibold mb-4">
                            Hourly Bookings
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
                                            value: "Bookings",
                                            angle: -90,
                                            position: "insideLeft",
                                            offset: 10,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [
                                            `${value} bookings`,
                                            "Bookings",
                                        ]}
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
                                        formatter={(value: number) => [
                                            `${value} bookings`,
                                            "Bookings",
                                        ]}
                                    />
                                    <Bar dataKey="bookings" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function SpotsTab({
                                     paidSpots,
                                     pendingSpots,
                                     spotPerformance,
                                     avgRating,
                                     numReviews,
                                 }: SpotsTabProps) {
    const verifiedSpots = useMemo(
        () => paidSpots.filter((spot) => spot.verification_status === "verified"),
        [paidSpots],
    )

    // Combine pending and paid spots that have performance data
    const spotsWithPerformance = useMemo(
        () =>
            [...pendingSpots, ...paidSpots]
                .filter((spot) => spotPerformance[spot.id])
                .map((spot) => ({
                    ...spot,
                    performance: spotPerformance[spot.id],
                })),
        [paidSpots, pendingSpots, spotPerformance],
    )

    // Aggregated data for Overall Performance
    const aggregatedPopularHours = useMemo(() => {
        const hoursMap: Record<number, number> = {}
        spotsWithPerformance.forEach((spot) => {
            spot.performance.popularHours.forEach(({ hour, bookings }) => {
                hoursMap[hour] = (hoursMap[hour] || 0) + bookings
            })
        })
        const completeHours = Array.from({ length: 24 }, (_, i) => ({
            hour: formatHour(i),
            reservations: hoursMap[i] || 0,
        }))
        return completeHours
    }, [spotsWithPerformance])

    const aggregatedPopularDays = useMemo(() => {
        const daysMap: Record<string, number> = {}
        spotsWithPerformance.forEach((spot) => {
            spot.performance.popularDays.forEach(({ day, bookings }) => {
                daysMap[day] = (daysMap[day] || 0) + bookings
            })
        })
        const completeDays = WEEKDAYS_ORDER.map((day) => ({
            day,
            reservations: daysMap[day] || 0,
        }))
        return completeDays
    }, [spotsWithPerformance])

    // Helper function to format hours
    function formatHour(hour: number) {
        const formattedHour = hour.toString().padStart(2, "0")
        return `${formattedHour}:00`
    }

    // Helper function to sort days
    function sortDays(days: Array<{ day: string; bookings: number }>) {
        const dayMap: Record<string, number> = {
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
            Sunday: 7,
        }
        return [...days].sort((a, b) => (dayMap[a.day] || 8) - (dayMap[b.day] || 8))
    }

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
                        <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">
                            {numReviews} review{numReviews !== 1 && "s"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Overall Performance Charts */}
            <Card className="p-4">
                <CardHeader>
                    <CardTitle>Overall Spot Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Overall Hourly Reservations */}
                        <div>
                            <h4 className="text-sm font-semibold mb-4">
                                Hourly Reservation Instances
                            </h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={aggregatedPopularHours}>
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

                        {/* Overall Popular Days */}
                        <div>
                            <h4 className="text-sm font-semibold mb-4">Popular Days</h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={aggregatedPopularDays}>
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
                </CardContent>
            </Card>

            {/* Spot Performance Cards */}
            <Accordion type="single" collapsible className="space-y-4">
                {spotsWithPerformance.map((spot) => (
                    <AccordionItem value={spot.id} key={spot.id}>
                        <AccordionTrigger>
                            <Card className="w-full">
                                <CardHeader className="flex justify-between items-center">
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
                                        {spot.verification_status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="flex justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Revenue</p>
                                        <p className="text-lg font-bold">
                                            ${Number(spot.performance.totalRevenue).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Bookings</p>
                                        <p className="text-lg font-bold">
                                            {spot.performance.totalBookings}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Occupancy Rate</p>
                                        <p className="text-lg font-bold">
                                            {Number(spot.performance.occupancyRate).toFixed(1)}%
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </AccordionTrigger>
                        <AccordionContent>
                            <SpotCard
                                spot={spot}
                                formatHour={formatHour}
                                sortDays={sortDays}
                                WEEKDAYS_ORDER={WEEKDAYS_ORDER}
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </motion.div>
    )
}
