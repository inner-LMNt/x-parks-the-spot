// components/RevenueTab.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BarChart,
    LineChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface RevenueSpot {
    spotId: string;
    spotName: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
    basePrice: number;
}

interface RevenueMetrics {
    monthlyRevenue: Array<{
        month: string;
        revenue: number;
        bookings: number;
    }>;
    dailyRevenue: Array<{
        date: string;
        revenue: number;
    }>;
    hourlyRevenue: Array<{
        hour: number;
        revenue: number;
    }>;
    revenueBySpot: RevenueSpot[];
}

interface RevenueTabProps {
    revenueMetrics: RevenueMetrics;
}

const RevenueTab: React.FC<RevenueTabProps> = ({ revenueMetrics }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Revenue Overview</CardTitle>
                    <CardDescription>Revenue trends across all spots</CardDescription>
                </CardHeader>
                <CardContent>
                    {revenueMetrics.monthlyRevenue.length === 0 ? (
                        <p className="text-gray-500">No monthly revenue data available.</p>
                    ) : (
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueMetrics.monthlyRevenue}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Spot</CardTitle>
                        <CardDescription>Comparison of earnings across parking spots</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {revenueMetrics.revenueBySpot.length === 0 ? (
                            <p className="text-gray-500">No revenue data available for spots.</p>
                        ) : (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={revenueMetrics.revenueBySpot}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="spotName" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                                        <Bar dataKey="revenue" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Hourly Revenue Distribution</CardTitle>
                        <CardDescription>Revenue patterns throughout the day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {revenueMetrics.hourlyRevenue.length === 0 ? (
                            <p className="text-gray-500">No hourly revenue data available.</p>
                        ) : (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={revenueMetrics.hourlyRevenue}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="hour" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                                        <Line
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Revenue Breakdown</CardTitle>
                    <CardDescription>Spot-by-spot revenue analysis</CardDescription>
                </CardHeader>
                <CardContent>
                    {revenueMetrics.revenueBySpot.length === 0 ? (
                        <p className="text-gray-500">No revenue data available for spots.</p>
                    ) : (
                        <div className="space-y-4">
                            {revenueMetrics.revenueBySpot
                                .sort((a, b) => b.revenue - a.revenue)
                                .map((spot) => (
                                    <div
                                        key={spot.spotId}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">{spot.spotName}</p>
                                            <p className="text-sm text-gray-500">
                                                {spot.bookings} bookings • ${spot.basePrice}/hr
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-600">
                                                ${spot.revenue.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {spot.occupancyRate.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default RevenueTab;
