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
import { MapPin, ShieldCheck, Star, Clock, ChevronDown } from "lucide-react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import SpotsSummaryCard from "./SpotsSummaryCard"

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

export interface SpotsTabProps {
  paidSpots: ParkingSpace[]
  pendingSpots: ParkingSpace[]
  spotPerformance: Record<string, SpotPerformance>
  avgRating: number
  numReviews: number
  selectedSpotId: string | null
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

function formatHour(hour: number) {
  const formattedHour = hour.toString().padStart(2, "0")
  return `${formattedHour}:00`
}

const PerformanceCharts: React.FC<{
  popularHours: Array<{ hour: string; reservations: number }>
  popularDays: Array<{ day: string; reservations: number }>
  className?: string
}> = ({ popularHours, popularDays, className }) => (
  <div className={className}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-semibold mb-4 text-slate-950">
          Popular Hours
        </h4>
        <div className="h-[200px] text-slate-950">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={popularHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
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

      <div>
        <h4 className="text-sm font-semibold mb-4 text-slate-950">
          Popular Days
        </h4>
        <div className="h-[200px] text-slate-950">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={popularDays}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
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
  </div>
)

export default function SpotsTab({
  paidSpots,
  pendingSpots,
  spotPerformance,
  avgRating,
  numReviews,
  selectedSpotId,
}: SpotsTabProps) {
  const verifiedSpots = useMemo(
    () => paidSpots.filter((spot) => spot.verification_status === "verified"),
    [paidSpots],
  )

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

  const selectedSpot = useMemo(
    () => spotsWithPerformance.find((spot) => spot.id === selectedSpotId),
    [spotsWithPerformance, selectedSpotId],
  )

  const aggregatedData = useMemo(() => {
    const source = selectedSpot ? [selectedSpot] : spotsWithPerformance

    const hoursMap: Record<number, number> = {}
    const daysMap: Record<string, number> = {}

    source.forEach((spot) => {
      spot.performance.popularHours.forEach(({ hour, bookings }) => {
        hoursMap[hour] = (hoursMap[hour] || 0) + bookings
      })
      spot.performance.popularDays.forEach(({ day, bookings }) => {
        daysMap[day] = (daysMap[day] || 0) + bookings
      })
    })

    return {
      hours: Array.from({ length: 24 }, (_, i) => ({
        hour: formatHour(i),
        reservations: hoursMap[i] || 0,
      })),
      days: WEEKDAYS_ORDER.map((day) => ({
        day,
        reservations: daysMap[day] || 0,
      })),
    }
  }, [spotsWithPerformance, selectedSpot])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <SpotsSummaryCard
        verifiedSpots={verifiedSpots.length}
        totalSpots={paidSpots.length}
        pendingSpots={pendingSpots.length}
        avgRating={avgRating}
        numReviews={numReviews}
      />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>
            {selectedSpot
              ? `${selectedSpot.name} Performance`
              : "Overall Spot Performance"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceCharts
            popularHours={aggregatedData.hours}
            popularDays={aggregatedData.days}
          />
        </CardContent>
      </Card>

      {!selectedSpotId && (
        <Accordion type="single" collapsible className="space-y-4">
          {spotsWithPerformance.map((spot) => (
            <AccordionItem
              value={spot.id}
              key={spot.id}
              className="border rounded-lg overflow-hidden bg-card"
            >
              <AccordionTrigger className="w-full px-6 py-4 hover:no-underline">
                <div className="w-full">
                  <div className="relative">
                    <Badge
                      variant={
                        spot.verification_status === "verified"
                          ? "default"
                          : spot.verification_status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                      className="absolute right-0 top-0"
                    >
                      {spot.verification_status}
                    </Badge>
                    <div className="pr-24">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {spot.name || "Unnamed Spot"}
                      </h3>
                      <div className="flex items-center mt-1 text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        {spot.location.address}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-lg font-bold text-slate-950">
                          ${Number(spot.performance.totalRevenue).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Bookings
                        </p>
                        <p className="text-lg font-bold text-slate-950">
                          {spot.performance.totalBookings}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Occupancy Rate
                        </p>
                        <p className="text-lg font-bold text-slate-950">
                          {Number(spot.performance.occupancyRate).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <PerformanceCharts
                  popularHours={aggregatedData.hours}
                  popularDays={aggregatedData.days}
                  className="mt-4"
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </motion.div>
  )
}
