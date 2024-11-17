'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ParkingSpace } from '@/types/type';
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
} from 'recharts';
import { Clock, MapPin, ShieldCheck, Star } from 'lucide-react';

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
}

export default function SpotsTab({
                                     paidSpots,
                                     pendingSpots,
                                     spotPerformance,
                                 }: SpotsTabProps) {
    const verifiedSpots = useMemo(
        () => paidSpots.filter((spot) => spot.verification_status === 'verified'),
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Verified Spots</CardTitle>
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

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
                        <Clock className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingSpots.length}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                        <Star className="w-4 h-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {verifiedSpots.length > 0
                                ? (
                                    verifiedSpots.reduce(
                                        (acc, spot) =>
                                            acc +
                                            (spot.avg_total_rating || 0),
                                        0
                                    ) / verifiedSpots.length
                                ).toFixed(1)
                                : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Based on{' '}
                            {verifiedSpots.reduce(
                                (acc, spot) => acc + (spot.ratings_count_availability || 0),
                                0
                            )}{' '}
                            reviews
                        </p>
                    </CardContent>
                </Card>
            </div>

            {spotsWithPerformance.map((spot) => (
                <Card key={spot.id} className="overflow-hidden">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{spot.name || 'Unnamed Spot'}</CardTitle>
                                <CardDescription className="flex items-center mt-1">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {spot.location.address}
                                </CardDescription>
                            </div>
                            <Badge
                                variant={
                                    spot.verification_status === 'verified'
                                        ? 'default'
                                        : spot.verification_status === 'pending'
                                            ? 'secondary'
                                            : 'destructive'
                                }
                            >
                                {spot.verification_status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-semibold mb-4">Hourly Occupancy</h4>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={spot.performance.popularHours}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="hour" />
                                            <YAxis />
                                            <Tooltip formatter={(value: number) => [`${value} bookings`, 'Bookings']} />
                                            <Line
                                                type="monotone"
                                                dataKey="bookings"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-4">Popular Days</h4>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={spot.performance.popularDays}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="day" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="bookings" fill="#10b981" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Total Revenue</p>
                                <p className="text-lg font-bold">${spot.performance.totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Occupancy Rate</p>
                                <p className="text-lg font-bold">
                                    {spot.performance.occupancyRate.toFixed(1)}%
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Avg Booking Length</p>
                                <p className="text-lg font-bold">
                                    {spot.performance.averageBookingLength.toFixed(1)}h
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-500">Active Bookings</p>
                                <p className="text-lg font-bold">{spot.performance.activeBookings}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </motion.div>
    );
}
