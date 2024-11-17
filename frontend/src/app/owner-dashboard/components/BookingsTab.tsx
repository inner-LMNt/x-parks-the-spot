'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInHours } from 'date-fns';

interface BookingStats {
    total: number;
    active: number;
    completed: number;
    canceled: number;
    avgDuration: number;
    completionRate: number;
}

interface BookingDetails {
    id: string;
    spotId: string;
    spotName: string;
    renterName: string;
    startTime: string;
    endTime: string;
    status: 'active' | 'completed' | 'canceled';
    price: number;
    duration: number;
    carDetails: {
        make: string;
        model: string;
        year: number;
        color: string;
    };
}

interface BookingMetrics {
    stats: BookingStats;
    recentBookings: BookingDetails[];
    bookingsByStatus: {
        active: BookingDetails[];
        completed: BookingDetails[];
        canceled: BookingDetails[];
    };
}

interface BookingsTabProps {
    bookingMetrics: BookingMetrics;
}

export default function BookingsTab({
                                        bookingMetrics
                                    }: BookingsTabProps) {
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredBookings = statusFilter === 'all'
        ? bookingMetrics.recentBookings
        : bookingMetrics.bookingsByStatus[statusFilter as keyof typeof bookingMetrics.bookingsByStatus];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex justify-between items-center">
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
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Total Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookingMetrics.stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Active Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookingMetrics.stats.active}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {bookingMetrics.stats.completionRate.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Avg Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {bookingMetrics.stats.avgDuration.toFixed(1)}h
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>
                        Showing {filteredBookings.length} bookings
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                    <TableCell>{booking.spotName}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div>{booking.renterName}</div>
                                            <div className="text-xs text-gray-500">
                                                {booking.carDetails.make} {booking.carDetails.model}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(parseISO(booking.startTime), 'PPP')}
                                    </TableCell>
                                    <TableCell>
                                        {booking.duration}h
                                    </TableCell>
                                    <TableCell>${booking.price}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            booking.status === 'completed' ? 'outline' :
                                                booking.status === 'active' ? 'default' :
                                                    'secondary'
                                        }>
                                            {booking.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>
    );
}
