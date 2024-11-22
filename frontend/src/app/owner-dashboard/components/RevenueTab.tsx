"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  create_account_session,
  connect_account,
} from "@/features/user/userSlice"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Scatter,
} from "recharts"
import {
  startOfWeek,
  startOfMonth,
  format,
  parseISO,
  formatDistance,
} from "date-fns"
import SummaryCard from "./RevenueSummaryCard"
import { DollarSign, TrendingUp } from "lucide-react"
import { loadConnectAndInitialize } from "@stripe/connect-js"
import {
  ConnectComponentsProvider,
  ConnectBalances,
} from "@stripe/react-connect-js"

interface DetailedRevenuePoint {
  timestamp: string
  actual: number
}

interface UpcomingRevenuePoint {
  timestamp: string
  potential: number
}

interface RevenueMetrics {
  historicalRevenue: DetailedRevenuePoint[]
  upcomingRevenue: UpcomingRevenuePoint[]
}

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

interface RevenueTabProps {
  revenueMetrics: RevenueMetrics
  bookingMetrics: BookingMetrics
  timeFilter: "7_days" | "30_days" | "1_year"
}

const RevenueTab: React.FC<RevenueTabProps> = ({
  revenueMetrics,
  bookingMetrics,
  timeFilter,
}) => {
  const connectedAccountId = useAppSelector((state) => state.user.stripeId)
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>()
  const dispatch = useAppDispatch()

  useEffect(() => {
    const fetchClientSecret = async () => {
      // const connectedAccountId = await dispatch(connect_account()).unwrap()
      const a = await dispatch(
        create_account_session({ accountId: connectedAccountId }),
      ).unwrap()
      console.log("a! " + JSON.stringify(a.account))
      return a.account
    }

    setStripeConnectInstance(
      loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PK || "",
        fetchClientSecret,
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#635BFF",
          },
        },
      }),
    )
  }, [connectedAccountId])

  useEffect(() => {
    dispatch(connect_account())
    setTabLoaded(true)
  }, [])

  // Utility function to group data
  const groupData = (
    data: DetailedRevenuePoint[] | UpcomingRevenuePoint[],
    granularity: "8_hours" | "day" | "week" | "month",
  ) => {
    const grouped: { [key: string]: any } = {}

    data.forEach((point) => {
      const date = parseISO(point.timestamp)
      let key: string

      switch (granularity) {
        case "8_hours":
          const hours = Math.floor(date.getHours() / 8) * 8
          const roundedDate = new Date(date)
          roundedDate.setHours(hours, 0, 0, 0)
          key = format(roundedDate, "yyyy-MM-dd HH:mm")
          break
        case "day":
          key = format(date, "yyyy-MM-dd")
          break
        case "week":
          key = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
          break
        case "month":
          key = format(startOfMonth(date), "yyyy-MM")
          break
        default:
          key = format(date, "yyyy-MM-dd")
      }

      if (!grouped[key]) {
        grouped[key] = { timestamp: key }
        // Initialize numerical fields for aggregation
        Object.keys(point).forEach((k) => {
          if (
            k !== "timestamp" &&
            typeof point[k as keyof typeof point] === "number"
          ) {
            grouped[key][k] = point[k as keyof typeof point]
          }
        })
      } else {
        // Aggregate numerical fields
        Object.keys(point).forEach((k) => {
          if (
            k !== "timestamp" &&
            typeof point[k as keyof typeof point] === "number"
          ) {
            grouped[key][k] += point[k as keyof typeof point]
          }
        })
      }
    })

    // Convert grouped object back to array
    return Object.values(grouped)
      .map((item) => ({
        ...item,
        timestamp: item.timestamp,
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
  }

  // Determine granularity for Historical Data based on timeFilter
  const granularityHistorical: "8_hours" | "day" | "week" | "month" =
    useMemo(() => {
      switch (timeFilter) {
        case "7_days":
          return "8_hours"
        case "30_days":
          return "day"
        case "1_year":
          return "month"
        default:
          return "week"
      }
    }, [timeFilter])

  // Process Historical Data with Aggregation
  const historicalData = useMemo(() => {
    return groupData(revenueMetrics.historicalRevenue, granularityHistorical)
  }, [revenueMetrics.historicalRevenue, granularityHistorical])

  // Format X-Axis Dates for Historical Chart
  const formatAxisDateHistorical = (timestamp: string) => {
    const date = parseISO(timestamp)
    switch (granularityHistorical) {
      case "8_hours":
        return format(date, "MM/dd HH:mm")
      case "day":
        return format(date, "MM/dd")
      case "week":
        return `Wk ${format(date, "MM/dd")}`
      case "month":
        return format(date, "MMM yyyy")
      default:
        return ""
    }
  }

  // Format Tooltip Dates for Historical Chart
  const formatTooltipDateHistorical = (timestamp: string) => {
    const date = parseISO(timestamp)
    switch (granularityHistorical) {
      case "8_hours":
        return format(date, "PPpp")
      case "day":
        return format(date, "PPpp")
      case "week":
        return `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d, yyyy")}`
      case "month":
        return format(date, "MMMM yyyy")
      default:
        return ""
    }
  }

  // Format X-Axis Dates for Upcoming Forecast Chart
  const formatAxisDateUpcoming = (timestamp: string) => {
    const date = parseISO(timestamp)
    return format(date, "MM/dd")
  }

  // Format Tooltip Dates for Upcoming Forecast Chart
  const formatTooltipDateUpcoming = (timestamp: string) => {
    const date = parseISO(timestamp)
    return format(date, "MMM d, yyyy")
  }

  // Format Currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  // Calculate Tick Interval for Historical Data
  const getTickIntervalHistorical = useMemo(() => {
    return Math.max(1, Math.floor(historicalData.length / 6))
  }, [historicalData.length])

  // Aggregate Upcoming Data (Next 7 Days Forecast)
  const upcomingData = useMemo(() => {
    return groupData(revenueMetrics.upcomingRevenue, "day")
  }, [revenueMetrics.upcomingRevenue])

  // Prepare Scatter Data for Upcoming Chart
  const potentialScatterData = useMemo(
    () =>
      revenueMetrics.upcomingRevenue
        .filter((point) => point.potential > 0)
        .map((point) => ({
          timestamp: point.timestamp,
          potential: point.potential,
        })),
    [revenueMetrics.upcomingRevenue],
  )

  // Compute Summary Metrics
  const summaryMetrics = useMemo(() => {
    // Total Actual Revenue
    const totalActualRevenue = revenueMetrics.historicalRevenue.reduce(
      (acc, curr) => acc + curr.actual,
      0,
    )

    // Total Projected Revenue
    const totalProjectedRevenue = revenueMetrics.upcomingRevenue.reduce(
      (acc, curr) => acc + curr.potential,
      0,
    )

    return {
      totalActualRevenue,
      totalProjectedRevenue,
    }
  }, [revenueMetrics])

  const [tabLoaded, setTabLoaded] = useState(false)

  return (
    tabLoaded && (
      <div className="space-y-6">
        {/* Main Summary Metrics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Key Revenue Metrics
            </CardTitle>
            <CardDescription>
              Overview of key revenue indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Total Actual Revenue */}
              <SummaryCard
                label="Total Actual Revenue"
                value={formatCurrency(summaryMetrics.totalActualRevenue)}
                Icon={DollarSign}
                iconColor="text-green-500"
              />

              {/* Total Projected Revenue */}
              <SummaryCard
                label="Total Projected Revenue"
                value={formatCurrency(summaryMetrics.totalProjectedRevenue)}
                Icon={TrendingUp}
                iconColor="text-blue-500"
              />
              <div className="space-y-4">
                {bookingMetrics?.recentBookings
                  ?.filter((booking) => booking.time_status === "upcoming")
                  ?.filter((booking) => booking.status !== "canceled")
                  ?.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {booking.spotName}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.startTime), "MMM d")} -
                          {format(new Date(booking.endTime), "MMM d")}
                          {booking.isMultiDay &&
                            ` (${booking.daysDuration} days)`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(booking.price)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistance(
                            new Date(booking.startTime),
                            new Date(),
                            { addSuffix: true },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="h-full">
          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <ConnectBalances />
          </ConnectComponentsProvider>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Historical Revenue Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {timeFilter === "7_days"
                  ? "Last 7 Days Revenue"
                  : timeFilter === "30_days"
                    ? "Last 30 Days Revenue"
                    : "Last Year Revenue"}
              </CardTitle>
              <CardDescription>
                Revenue trends over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart */}
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={historicalData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatAxisDateHistorical}
                      interval={getTickIntervalHistorical}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: "#666", fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fill: "#666", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        // @ts-ignore
                        formatCurrency(value),
                        "Actual Revenue",
                      ]}
                      labelFormatter={formatTooltipDateHistorical}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "6px",
                        padding: "8px",
                        border: "1px solid #eaeaea",
                        fontSize: "12px",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    {/* Actual Revenue Line */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Revenue Forecast Chart Card */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Next 7 Days Revenue Forecast</CardTitle>
              <CardDescription>
                Projected revenue for the upcoming 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart Section */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={upcomingData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatAxisDateUpcoming}
                      interval={Math.max(
                        1,
                        Math.floor(upcomingData.length / 6),
                      )}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: "#666", fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tickFormatter={formatCurrency}
                      tick={{ fill: "#666", fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: "#666", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        // @ts-ignore
                        formatCurrency(value),
                        "Future Revenue",
                      ]}
                      labelFormatter={formatTooltipDateUpcoming}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "6px",
                        padding: "8px",
                        border: "1px solid #eaeaea",
                        fontSize: "12px",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="potential"
                      name="Potential Revenue"
                      stroke="#93c5fd"
                      strokeDasharray="5 5"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Upcoming Bookings Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Upcoming Bookings
                </h3>
                <SummaryCard
                  label="Total Projected Revenue"
                  value={formatCurrency(summaryMetrics.totalProjectedRevenue)}
                  Icon={TrendingUp}
                  iconColor="text-blue-500"
                />
                <div className="space-y-4">
                  {bookingMetrics?.recentBookings
                    ?.filter((booking) => booking.time_status === "upcoming")
                    ?.filter((booking) => booking.status !== "canceled")

                    ?.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {booking.spotName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {format(new Date(booking.startTime), "MMM d")} -
                            {format(new Date(booking.endTime), "MMM d")}
                            {booking.isMultiDay &&
                              ` (${booking.daysDuration} days)`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(booking.price)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDistance(
                              new Date(booking.startTime),
                              new Date(),
                              { addSuffix: true },
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  )
}

export default RevenueTab
