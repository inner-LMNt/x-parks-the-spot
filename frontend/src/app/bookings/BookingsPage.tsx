// src/app/bookings/BookingsPage.tsx

"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserReservations, cancelReservation } from '@/features/reservations/reservationsSlice';
import { CarInfo, Reservation } from '@/types/type';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {MapPin, Clock, Calendar, ArrowRightCircle, Loader2, FileWarning} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';
import { fetchUserCars, resetCarError } from '@/features/cars/carSlice';
import { Button } from '@/components/ui/button';
import DeleteReservationModal from '@/components/custom/DeleteReservationModal';

// SectionHeader Component
function SectionHeader({ title }: { title: string }) {
    return (
        <h2 className="text-2xl font-semibold mb-4 border-b border-gray-200 pb-2 text-gray-800">
            {title}
        </h2>
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

// ReservationCard Component
function ReservationCard({
    reservation,
    isPast = false,
    carMap,
    onCancel
}: {
    reservation: Reservation;
    isPast?: boolean;
    carMap: { [key: string]: CarInfo };
    onCancel: (reservation: Reservation) => void;
}) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/bookings/${reservation.parking_space_id}`);
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCancel(reservation);
    };

    // Retrieve the car information using car_id
    const car = carMap[reservation.car_info_id as string];

    // Log for debugging
    useEffect(() => {
        console.log(`Reservation ID: ${reservation.name}, Car ID: ${reservation.car_info_id}, Car Info:`, car);
    }, [reservation, car]);

    const now = new Date();
    const startTime = new Date(reservation.start_time ?? now);
    const isUpcoming = startTime > now && reservation.status !== 'canceled';
    const timeTillCancel = startTime.getTime() - now.getTime() - 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const isCancellable = timeTillCancel > 0;

    const formattimeTillCancel = (time: number) => {
        const hours = Math.floor(time / (1000 * 60 * 60));
        const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    return (
        <Card>
            <CardHeader className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg font-medium text-gray-900">
                    <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                    {reservation.name}
                </CardTitle>
                <Badge variant="secondary">
                    {reservation.status}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500"/>
                    <p className="text-sm text-gray-700">
                        {format(new Date(reservation.start_time ?? new Date()), 'PPP')}
                    </p>
                </div>
                <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 mr-2 text-gray-500"/>
                    <p className="text-sm text-gray-700">
                        {format(new Date(reservation.start_time ?? new Date()), 'p')} -{' '}
                        {format(new Date(reservation.end_time ?? new Date()), 'p')}
                    </p>
                </div>
                <div className="flex items-center mb-2">
                    <p className="text-sm text-gray-700">
                        <strong>License Plate:</strong> {car?.license_plate}
                    </p>
                </div>
                <div className="flex justify-center gap-4">
                    <div className="flex justify-end mt-4">
                        <Button onClick={() => router.push(`/bookings/${reservation.parking_space_id}/reserve`)}>
                            Book Again
                        </Button>
                    </div>
                    {!isPast && reservation.status !== 'canceled' && (
                        <div className="flex justify-end mt-4">
                            <Button onClick={() => router.push(`/extend/${reservation.id}`)}>
                                Extend Reservation
                            </Button>
                        </div>
                    )}
                </div>
                {isUpcoming && (
                    <>
                        {isCancellable ? (
                            <p className="text-sm text-gray-700">
                                Time to cancel: {formattimeTillCancel(timeTillCancel)}
                            </p>
                        ) : (
                            <p className="text-sm text-red-500">
                                Reservation is no longer cancellable
                            </p>
                        )}
                        {isCancellable && (
                            <div className="flex justify-center mt-4">
                                <Button variant="destructive" onClick={handleCancelClick}>
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function BookingsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    const isLoggedIn = useAppSelector(state => state.user.isLoggedIn);
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900">
                <p className="text-xl">Please <Link href="/login" className="text-blue-500 underline">log in</Link> to view your spots.</p>
            </div>
        );
    }
    const dispatch = useAppDispatch();
    const router = useRouter();
    const reservations = useAppSelector((state) => state.reservations.reservations);
    const loading = useAppSelector((state) => state.reservations.loading);
    const error = useAppSelector((state) => state.reservations.error);
    const [domLoaded, setDomLoaded] = useState(false);

    useEffect(() => {
        setDomLoaded(true);
    }, []);

    // Selectors from the carSlice
    const cars = useAppSelector((state) => state.cars.cars);
    const carsLoading = useAppSelector((state) => state.cars.loading);
    const carsError = useAppSelector((state) => state.cars.error);
    const userName = useAppSelector((state) => state.user.name);

    // Create a carMap for efficient lookup
    const carMap = useMemo(() => {
        const map: { [key: string]: CarInfo } = {};
        cars.forEach((car: CarInfo) => {
            map[car.id as string] = car;
        });
        console.log('Car Map:', map);
        return map;
    }, [cars]);

    // Log reservations and cars for debugging
    useEffect(() => {
        console.log('Reservations:', reservations);
        console.log('Cars:', cars);
    }, [reservations, cars]);

    useEffect(() => {
        // Dispatch action to fetch user's reservations
        // @ts-ignore
        dispatch(fetchUserReservations());

        // Dispatch action to fetch user's cars
        dispatch(fetchUserCars());
    }, [dispatch]);

    const now = new Date();

    const upcomingReservations = reservations.filter(
        (reservation: Reservation) => new Date(reservation.start_time ?? now) > now && reservation.status !== 'canceled'
    );

    const currentReservations = reservations.filter(
        (reservation: Reservation) =>
            new Date(reservation.start_time ?? now) <= now && new Date(reservation.end_time ?? now) >= now && reservation.status !== 'canceled'
    );

    const pastReservations = reservations.filter(
        (reservation: Reservation) => new Date(reservation.end_time ?? now) < now
    );

    const cancelledReservations = reservations.filter(
        (reservation: Reservation) => reservation.status === 'canceled'
    );

    // Combined Loading State
    const isLoading = loading || carsLoading;

    const handleCancel = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsModalOpen(true);
    };

    const handleConfirmCancel = () => {
        if (selectedReservation) {
            setIsModalOpen(false);
            setSelectedReservation(null);
        }
        dispatch(fetchUserReservations());
    };

    return (
        domLoaded && (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <div className="flex-grow container mx-auto p-4 max-w-5xl">
                    {/* Header Section */}
                    <header className="flex flex-col items-center mb-8">
                        <Avatar className="w-24 h-24 mb-4" />
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{userName}</h1>
                        <div className="flex space-x-12 mt-4">
                            <StatCard label="Total Reservations" value={reservations.length} />
                            <StatCard label="Years with Us" value={2} />
                        </div>
                    </header>

                    {/* Your Cars Section */}
                    <section className="mb-8">
                        <SectionHeader title="Your Cars" />
                        <div className="grid gap-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="animate-spin text-gray-500 w-8 h-8" />
                                    <span className="ml-2 text-gray-500">Loading your data...</span>
                                </div>
                            ) : carsError ? (
                                <p className="text-red-500">Error loading cars: {carsError}</p>
                            ) : cars.length > 0 ? (
                                cars.map((car: CarInfo) => (
                                    <Card key={car.id} className="p-4">
                                        <CardContent>
                                            <p className="text-lg font-semibold">{car.make} {car.model}</p>
                                            <p className="text-sm text-gray-600">License Plate: {car.license_plate}</p>
                                            {/* Add more car details if needed */}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div>
                                    <p className='text-gray-600'> No cars available. Please add a car.</p>
                                    <Button onClick={() => router.push('/profile/add-car')} className="mt-2">
                                        Add a Car
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Global Loading Indicator */}
                    {isLoading && (
                        <div className="flex items-center justify-center my-4">
                            <Loader2 className="animate-spin text-gray-500 w-8 h-8"/>
                            <span className="ml-2 text-gray-500">Loading your reservations...</span>
                        </div>
                    )}
                <SectionHeader title="Reports"/>
                <div className="text-left mb-4 text-slate-950">
                    <Link href="/reports" passHref>
                        <Button variant="outline">
                            <FileWarning className="mr-2"/> Report a reservation issue
                        </Button>
                    </Link>
                </div>

                    {/* Current Reservations */}
                    {!isLoading && currentReservations.length > 0 && (
                        <section className="mb-8">
                            <SectionHeader title="Current Reservations" />
                            <div className="grid gap-6">
                                {currentReservations.map((reservation: Reservation) => (
                                    <ReservationCard key={reservation.id} reservation={reservation} carMap={carMap} onCancel={handleCancel} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming Reservations */}
                    {!isLoading && upcomingReservations.length > 0 && (
                        <section className="mb-8">
                            <SectionHeader title="Upcoming Reservations" />
                            <div className="grid gap-6">
                                {upcomingReservations.map((reservation: Reservation) => (
                                    <ReservationCard key={reservation.id} reservation={reservation} carMap={carMap} onCancel={handleCancel} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Past Reservations */}
                    {!isLoading && pastReservations.length > 0 && (
                        <section className="mb-8">
                            <SectionHeader title="Past Reservations" />
                            <div className="grid gap-6">
                                {pastReservations.map((reservation: Reservation) => (
                                    <ReservationCard key={reservation.id} reservation={reservation} isPast carMap={carMap} onCancel={handleCancel} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Cancelled Reservations */}
                    {!isLoading && cancelledReservations.length > 0 && (
                        <section className="mb-8">
                            <SectionHeader title="Cancelled Reservations" />
                            <div className="grid gap-6">
                                {cancelledReservations.map((reservation: Reservation) => (
                                    <ReservationCard key={reservation.id} reservation={reservation} carMap={carMap} onCancel={handleCancel} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* No Reservations */}
                    {!isLoading && reservations.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64">
                            <MapPin className="w-12 h-12 text-gray-400 mb-4" />
                            {error && <p className="text-red-500">Failed to fetch reservations at this time.</p>}
                            <p className="text-gray-500">You have no reservations.</p>
                            <Link href="/search" passHref>
                                <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                                    Make a Reservation
                                </button>
                            </Link>
                        </div>
                    )}
                    <div className="flex h-16">
                    </div>
                </div>
                <DeleteReservationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    reservation={selectedReservation!}
                    onConfirm={handleConfirmCancel}
                />
            </div>
        )
    );
}