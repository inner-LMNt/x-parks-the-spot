// src/app/owner-dashboard/OwnerDashboard.tsx

'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchOwnerReservations } from '@/features/owner-reservations/ownerReservationsSlice';
import { getOwnerSpots } from '@/features/owner/ownerSlice';
import { fetchDashboardAnalytics } from '@/features/dashboard-analytics/dashboardAnalyticsSlice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RevenueTab from './components/RevenueTab';
import BookingsTab from './components/BookingsTab';
import SpotsTab from './components/SpotsTab';
import RatingsTab from './components/RatingsTab'; // Import the new RatingsTab component

export default function OwnerDashboard() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [selectedTab, setSelectedTab] = React.useState('metrics');

    const { paidSpots, pendingSpots, loading: spotsLoading, error: spotsError } =
        useAppSelector((state) => state.owner);
    const {
        ownerReservations,
        loading: reservationsLoading,
        error: reservationsError,
    } = useAppSelector((state) => state.ownerReservations);
    const {
        analytics,
        loading: analyticsLoading,
        error: analyticsError,
    } = useAppSelector((state) => state.dashboardAnalytics);

    // Fetch initial data
    useEffect(() => {
        dispatch(getOwnerSpots());
        dispatch(fetchOwnerReservations());
        dispatch(fetchDashboardAnalytics());
    }, [dispatch]);

    const loading = spotsLoading || reservationsLoading || analyticsLoading;
    const error = spotsError || reservationsError || analyticsError;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                        Loading dashboard data...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <p className="text-red-500">{error}</p>
                    <Button
                        onClick={() => {
                            dispatch(getOwnerSpots());
                            dispatch(fetchOwnerReservations());
                            dispatch(fetchDashboardAnalytics());
                        }}
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gray-50"
        >
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
                <motion.div
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    className="container mx-auto px-4 py-4 relative"
                >
                    <Button
                        variant="ghost"
                        className="absolute left-4 flex items-center text-gray-800"
                        onClick={() => router.push('/myspots')}
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Back
                    </Button>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mt-6 text-slate-950">
                            Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">
                            {paidSpots.length} active spots • {ownerReservations.length} total
                            bookings
                        </p>
                    </div>
                </motion.div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <Tabs
                    value={selectedTab}
                    onValueChange={setSelectedTab}
                    className="space-y-4"
                >
                    <TabsList className="grid w-full grid-cols-5"> {/* Updated grid-cols to 5 */}
                        <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        <TabsTrigger value="bookings">Bookings</TabsTrigger>
                        <TabsTrigger value="spots">Spots</TabsTrigger>
                        <TabsTrigger value="ratings">Ratings</TabsTrigger> {/* Re-added Ratings tab */}
                    </TabsList>

                    {analytics && (
                        <>
                            <TabsContent value="revenue">
                                <RevenueTab revenueMetrics={analytics.revenueMetrics} />
                            </TabsContent>

                            <TabsContent value="bookings">
                                <BookingsTab bookingMetrics={analytics.bookingMetrics} />
                            </TabsContent>

                            <TabsContent value="spots">
                                <SpotsTab
                                    paidSpots={paidSpots}
                                    pendingSpots={pendingSpots}
                                    spotPerformance={analytics.spotPerformance}
                                />
                            </TabsContent>

                            <TabsContent value="ratings">
                                <RatingsTab ratingMetrics={analytics.ratingMetrics} />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
        </motion.div>
    );
}
