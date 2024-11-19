'use client';

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "recharts";
import { startOfWeek, startOfMonth, format, parseISO } from 'date-fns';

interface DetailedRevenuePoint {
  timestamp: string;
  actual: number;
  projected: number;
  bookingCount: number;
  avgBookingValue: number;
  cumulativeRevenue: number;
  periodOverPeriodGrowth: number;
}

interface UpcomingRevenuePoint {
  timestamp: string;
  confirmed: number;
  potential: number;
  bookingCount: number;
  spotUtilization: number;
  availableSpots: number;
}

interface RevenueMetrics {
  historicalRevenue: DetailedRevenuePoint[];
  upcomingRevenue: UpcomingRevenuePoint[];
}

interface RevenueTabProps {
  revenueMetrics: RevenueMetrics;
  timeFilter: "7_days" | "30_days" | "1_year";
}

const RevenueTab: React.FC<RevenueTabProps> = ({ revenueMetrics, timeFilter }) => {
  // Utility function to group data
  const groupData = (
      data: DetailedRevenuePoint[] | UpcomingRevenuePoint[],
      granularity: 'day' | 'week' | 'month'
  ) => {
    const grouped: { [key: string]: any } = {};

    data.forEach(point => {
      const date = parseISO(point.timestamp);
      let key: string;

      switch (granularity) {
        case 'day':
          key = format(date, 'yyyy-MM-dd');
          break;
        case 'week':
          key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Weeks start on Monday
          break;
        case 'month':
          key = format(startOfMonth(date), 'yyyy-MM');
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }

      if (!grouped[key]) {
        grouped[key] = { ...point, timestamp: key };
        // Initialize numerical fields for aggregation
        Object.keys(point).forEach(k => {
          if (k !== 'timestamp' && typeof point[k as keyof typeof point] === 'number') {
            grouped[key][k] = point[k as keyof typeof point];
          }
        });
      } else {
        // Aggregate numerical fields
        Object.keys(point).forEach(k => {
          if (k !== 'timestamp' && typeof point[k as keyof typeof point] === 'number') {
            grouped[key][k] += point[k as keyof typeof point];
          }
        });
      }
    });

    // Convert grouped object back to array
    return Object.values(grouped)
        .map(item => ({
          ...item,
          timestamp: item.timestamp,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  // Determine granularity for Historical Data based on timeFilter
  const granularityHistorical: 'day' | 'week' | 'month' = useMemo(() => {
    switch (timeFilter) {
      case '7_days':
        return 'day';
      case '30_days':
        return 'week'; // Change this to 'day' for finer granularity if desired
      case '1_year':
        return 'month';
      default:
        return 'day';
    }
  }, [timeFilter]);

  // Determine granularity for Upcoming Data (finer granularity)
  const granularityUpcoming: 'day' = 'day';

  // Process Historical Data with Aggregation
  const historicalData = useMemo(() => {
    const aggregated = groupData(revenueMetrics.historicalRevenue, granularityHistorical);
    return aggregated.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp),
    }));
  }, [revenueMetrics.historicalRevenue, granularityHistorical]);

  const daysDifference = useMemo(() => {
    if (!historicalData.length) return 0;
    const startDate = historicalData[0].timestamp;
    const endDate = historicalData[historicalData.length - 1].timestamp;
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [historicalData]);

  // Format X-Axis Dates
  const formatAxisDate = (timestamp: string | Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (granularityHistorical === 'day') {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        hour12: true
      });
    } else if (granularityHistorical === 'week') {
      return `Wk ${format(date, 'MM/dd')}`;
    } else if (granularityHistorical === 'month') {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
    }
    return '';
  };

  // Format Tooltip Dates
  const formatTooltipDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (granularityHistorical === 'day') {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } else if (granularityHistorical === 'week') {
      return `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;
    } else if (granularityHistorical === 'month') {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    }
    return '';
  };

  // Format Currency
  const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);

  // Calculate Tick Interval for Historical Data
  const getTickInterval = useMemo(() => {
    return Math.max(1, Math.floor(historicalData.length / 6));
  }, [historicalData.length]);

  // Calculate Tick Interval for Upcoming Data
  const getTickIntervalUpcoming = (dataLength: number) => {
    return Math.max(1, Math.floor(dataLength / 6));
  };

  // Aggregate Upcoming Data with Finer Granularity
  const upcomingData = useMemo(() => {
    return groupData(revenueMetrics.upcomingRevenue, granularityUpcoming);
  }, [revenueMetrics.upcomingRevenue, granularityUpcoming]);

  // Format Upcoming Data for Chart
  const formattedUpcomingData = useMemo(() => {
    return upcomingData.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp),
    }));
  }, [upcomingData]);

  // Prepare Scatter Data for Upcoming Chart
  const confirmedScatterData = useMemo(() =>
          formattedUpcomingData
              .filter(point => point.confirmed > 0)
              .map(point => ({
                timestamp: point.timestamp,
                confirmed: point.confirmed
              })),
      [formattedUpcomingData]
  );

  const potentialScatterData = useMemo(() =>
          formattedUpcomingData
              .filter(point => point.potential > 0)
              .map(point => ({
                timestamp: point.timestamp,
                potential: point.potential
              })),
      [formattedUpcomingData]
  );

  const spotUtilizationScatterData = useMemo(() =>
          formattedUpcomingData
              .filter(point => point.spotUtilization > 0)
              .map(point => ({
                timestamp: point.timestamp,
                spotUtilization: point.spotUtilization
              })),
      [formattedUpcomingData]
  );

  return (
      <div className="space-y-6">
        {/* Historical Revenue Chart */}
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
              Revenue trends and booking patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={historicalData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatAxisDate}
                      interval={getTickInterval}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'smoothedRevenue') {
                          return [formatCurrency(value), 'Average Revenue'];
                        }
                        return [formatCurrency(value), 'Actual Revenue'];
                      }}
                      labelFormatter={formatTooltipDate}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid #eaeaea',
                        fontSize: '12px',
                      }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {/* Main smooth line */}
                  <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                  />
                  {/* Actual data points as Scatter */}
                  <Scatter
                      name="Individual Bookings"
                      dataKey="actual"
                      fill="#3b82f6"
                      shape="circle"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Next 7 Days Revenue Forecast</CardTitle>
            <CardDescription>
              Detailed breakdown of confirmed bookings and potential revenue with spot utilization metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={formattedUpcomingData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => format(new Date(timestamp), 'MM/dd')}
                      interval={getTickIntervalUpcoming(formattedUpcomingData.length)}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <YAxis
                      yAxisId="revenue"
                      orientation="left"
                      tickFormatter={(value) => `$${value}`}
                      tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <YAxis
                      yAxisId="growth"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <Tooltip
                      formatter={(value: number, name: string) => {
                        switch (name) {
                          case 'confirmed':
                            return [`$${value}`, 'Confirmed Revenue'];
                          case 'potential':
                            return [`$${value}`, 'Potential Revenue'];
                          case 'spotUtilization':
                            return [`${value}%`, 'Utilization'];
                          default:
                            return [value, name];
                        }
                      }}
                      labelFormatter={(timestamp: string) =>
                          format(new Date(timestamp), 'MMM d, yyyy')
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid #eaeaea',
                        fontSize: '12px',
                      }}
                  />
                  <Legend verticalAlign="top" height={86} />
                  {/* Confirmed Revenue Line */}
                  <Line
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="confirmed"
                      name="Confirmed Revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                  />
                  {/* Potential Revenue Line */}
                  <Line
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="potential"
                      name="Potential Revenue"
                      stroke="#93c5fd"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                  />
                  {/* Spot Utilization Line */}
                  <Line
                      yAxisId="growth"
                      type="monotone"
                      dataKey="spotUtilization"
                      name="Utilization"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                  />
                  {/* Scatter for Confirmed Revenue Points */}
                  <Scatter
                      yAxisId="revenue"
                      name="Confirmed Revenue Points"
                      data={confirmedScatterData}
                      fill="#3b82f6"
                      shape="circle"
                  />
                  {/* Scatter for Potential Revenue Points */}
                  <Scatter
                      yAxisId="revenue"
                      name="Potential Revenue Points"
                      data={potentialScatterData}
                      fill="#93c5fd"
                      shape="circle"
                  />
                  {/* Scatter for Spot Utilization Points */}
                  <Scatter
                      yAxisId="growth"
                      name="Utilization Points"
                      data={spotUtilizationScatterData}
                      fill="#10b981"
                      shape="circle"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default RevenueTab;
