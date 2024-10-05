// src/app/bookings/BookingsPage.tsx

"use client";

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { Reservation } from '@/types/type';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, Calendar, ArrowRightCircle, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';

export default function BookingsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const reservations = useAppSelector((state) => state.reservations.reservations);
    const loading = useAppSelector((state) => state.reservations.loading);
    const error = useAppSelector((state) => state.reservations.error);

    useEffect(() => {
        dispatch(fetchUserReservations());
    }, [dispatch]);

    const now = new Date();

    const upcomingReservations = reservations.filter(
        (reservation) => new Date(reservation.start_time) > now
    );

    const currentReservations = reservations.filter(
        (reservation) =>
            new Date(reservation.start_time) <= now && new Date(reservation.end_time) >= now
    );

    const pastReservations = reservations.filter(
        (reservation) => new Date(reservation.end_time) < now
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <div className="flex-grow container mx-auto p-4 max-w-5xl">
                {/* Header Section */}
                <header className="flex flex-col items-center mb-8">
                    <Avatar className="w-24 h-24 mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">John Doe</h1>
                    <div className="flex space-x-12 mt-4">
                        <StatCard label="Total Reservations" value={reservations.length} />
                        <StatCard label="Years with Us" value={2} />
                    </div>
                </header>

                {/* Global Loading Indicator */}
                {loading && (
                    <div className="flex items-center justify-center my-4">
                        <Loader2 className="animate-spin text-gray-500 w-8 h-8" />
                        <span className="ml-2 text-gray-500">Loading your reservations...</span>
                    </div>
                )}

                {/* Global Error Message */}
                {error && (
                    <div className="flex items-center justify-center my-4">
                        <p className="text-center text-red-500">Error: {error}</p>
                    </div>
                )}

                {/* Current Reservations */}
                {!loading && !error && currentReservations.length > 0 && (
                    <section className="mb-8">
                        <SectionHeader title="Current Reservations" />
                        <div className="grid gap-6">
                            {currentReservations.map((reservation) => (
                                <ReservationCard key={reservation.id} reservation={reservation} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Upcoming Reservations */}
                {!loading && !error && upcomingReservations.length > 0 && (
                    <section className="mb-8">
                        <SectionHeader title="Upcoming Reservations" />
                        <div className="grid gap-6">
                            {upcomingReservations.map((reservation) => (
                                <ReservationCard key={reservation.id} reservation={reservation} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Past Reservations */}
                {!loading && !error && pastReservations.length > 0 && (
                    <section className="mb-8">
                        <SectionHeader title="Past Reservations" />
                        <div className="grid gap-6">
                            {pastReservations.map((reservation) => (
                                <ReservationCard key={reservation.id} reservation={reservation} isPast />
                            ))}
                        </div>
                    </section>
                )}

                {/* No Reservations */}
                {!loading && !error && reservations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64">
                        <MapPin className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">You have no reservations.</p>
                        <Link href="/book" passHref>
                            <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                                Make a Reservation
                            </button>
                        </Link>
                    </div>
                )}
            </div>
            {/* The Bottom Navbar is rendered elsewhere in your application */}
        </div>
    );
}

// StatCard Component
function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col items-center">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
        </div>
    );
}

// SectionHeader Component
function SectionHeader({ title }: { title: string }) {
    return (
        <h2 className="text-2xl font-semibold mb-4 border-b border-gray-200 pb-2 text-gray-800">
            {title}
        </h2>
    );
}

// ReservationCard Component
function ReservationCard({
                             reservation,
                             isPast = false,
                         }: {
    reservation: Reservation;
    isPast?: boolean;
}) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/bookings/${reservation.parking_space_id}`);
    };

    return (
        <Card
            className="cursor-pointer transition-transform transform hover:scale-105"
            onClick={handleClick}
        >
            <CardHeader className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg font-medium text-gray-900">
                    <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                    {reservation.parking_space_id /* Ideally, fetch parking_space_name */}
                </CardTitle>
                <Badge variant="secondary">
                    {reservation.status}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <p className="text-sm text-gray-700">
                        {format(new Date(reservation.start_time ?? new Date()), 'PPP')}
                    </p>
                </div>
                <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                    <p className="text-sm text-gray-700">
                        {format(new Date(reservation.start_time ?? new Date()), 'p')} -{' '}
                        {format(new Date(reservation.end_time ?? new Date()), 'p')}
                    </p>
                </div>
                <div className="flex items-center mb-2">
                    <p className="text-sm text-gray-700">
                        <strong>License Plate:</strong> {reservation.car_info.license_plate}
                    </p>
                </div>
                {isPast && (
                    <div className="flex justify-end mt-4">
                        <ArrowRightCircle className="w-5 h-5 text-blue-500" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
