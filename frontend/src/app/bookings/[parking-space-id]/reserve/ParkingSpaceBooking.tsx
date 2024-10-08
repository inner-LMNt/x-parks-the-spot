"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    bookParkingSpace,
    resetError,
    fetchUserCarInfos,
} from '@/features/reservations/reservationsSlice';
import {
    fetchParkingSpace,
    unlockParkingSpace,
    lockParkingSpace
} from "@/features/parking-space/parkingSpaceSlice";
import { ReservationCreateRequest, Reservation, CarInfo } from '@/types/type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, DollarSign, Clock, Star, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ParkingSpaceBooking() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const params = useParams();
    const parkingSpaceId = params?.['parking-space-id'] as string ?? "invalid";
    const router = useRouter();
    const searchParams = useSearchParams();
    const previousUrl = searchParams?.get('previousUrl') ?? '/bookings';

    const dispatch = useAppDispatch();
    const parkingSpace = useAppSelector((state) => state.parkingSpace.parkingSpace);
    const loading = useAppSelector((state) => state.parkingSpace.loading);
    const error = useAppSelector((state) => state.parkingSpace.error);
    const lockStatus = useAppSelector((state) => state.parkingSpace.lockStatus);
    const lockExpiresAt = useAppSelector((state) => state.parkingSpace.lockExpiresAt);
    const bookingError = useAppSelector((state) => state.parkingSpace.error);
    const userReservations = useAppSelector((state) =>
        state.reservations.reservations.filter((r: Reservation) => r.parking_space_id === parkingSpaceId)
    );
    const carInfos = useAppSelector((state) => state.reservations.carInfos);

    const [booking, setBooking] = useState<ReservationCreateRequest>({
        parking_space_id: parkingSpaceId,
        start_time: '',
        end_time: '',
        car_info_id: '',
        renter_id: 'user1' // Replace with actual authenticated user ID
    });

    const [timer, setTimer] = useState<number>(0); // Time left in milliseconds

    const isMounted = useRef<boolean>(false);
    const isLocked = useRef<boolean>(false); // Ref to track if parking space is locked

    // Fetch parking space details and user's car info
    useEffect(() => {
        dispatch(fetchParkingSpace(parkingSpaceId));
        dispatch(fetchUserCarInfos());
    }, [dispatch, parkingSpaceId]);

    // Lock the parking space when the component mounts
    useEffect(() => {
        isMounted.current = true;

        if (!isLocked.current) {
            dispatch(lockParkingSpace({ parking_space_id: parkingSpaceId, lock_duration: 'PT5M' }))
                .unwrap()
                .then(() => {
                    isLocked.current = true; // Mark as locked
                })
                .catch((error: any) => {
                    toast({
                        title: 'Lock Failed',
                        description: error || 'Unable to lock the parking space.',
                        variant: 'destructive',
                    });
                    router.push(previousUrl);
                });
        }

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isMounted.current && isLocked.current) {
                e.preventDefault();
                isLocked.current = false;
                dispatch(unlockParkingSpace(parkingSpaceId))
                    .unwrap()
                    .catch((error: any) => console.error('Failed to unlock on unload:', error));
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (isMounted.current && isLocked.current) {
                isLocked.current = false;
                dispatch(unlockParkingSpace(parkingSpaceId))
                    .unwrap()
                    .catch((error: any) => console.error('Failed to unlock on unmount:', error));
            }
            isMounted.current = false;
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [dispatch, parkingSpaceId, router, previousUrl]);

    // Handle lock expiration and set up timer
    useEffect(() => {
        if (lockExpiresAt) {
            const updateTimer = () => {
                const timeLeft = lockExpiresAt - Date.now();
                if (timeLeft <= 0) {
                    setTimer(0);
                    toast({
                        title: 'Booking Session Expired',
                        description: 'Your booking session has expired due to inactivity.',
                        variant: 'destructive',
                    });
                    router.push(previousUrl);
                } else {
                    setTimer(timeLeft);
                }
            };

            updateTimer();

            const interval = setInterval(updateTimer, 1000);

            return () => clearInterval(interval);
        }
    }, [lockExpiresAt, router, previousUrl]);

    // Handle booking errors
    useEffect(() => {
        if (bookingError) {
            toast({
                title: 'Booking Failed',
                description: bookingError,
                variant: 'destructive',
            });
            dispatch(resetError());
        }
    }, [bookingError, dispatch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBooking((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true); // Mark the form as submitting

        // Validate input fields
        if (!booking.car_info_id) {
            toast({
                title: 'Car Not Selected',
                description: 'Please select a car before proceeding with the booking.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        if (!isValidDate(booking.start_time) || !isValidDate(booking.end_time)) {
            toast({
                title: 'Invalid Date',
                description: 'Please enter valid start and end times.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        if (new Date(booking.end_time) <= new Date(booking.start_time)) {
            toast({
                title: 'Invalid Time',
                description: 'End time must be after start time.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        const startDateTime = new Date(booking.start_time).toISOString();
        const endDateTime = new Date(booking.end_time).toISOString();

        const reservationRequest: ReservationCreateRequest = {
            parking_space_id: booking.parking_space_id,
            start_time: startDateTime,
            end_time: endDateTime,
            car_info_id: booking.car_info_id,
            renter_id: booking.renter_id,
        };

        try {
            await dispatch(bookParkingSpace(reservationRequest)).unwrap();
            toast({
                title: 'Booking Successful',
                description: 'Your reservation has been confirmed.',
                variant: "success",
            });
            router.push('/bookings');
        } catch (error: any) {
            toast({
                title: 'Booking Failed',
                description: error.message || 'Unable to complete your booking.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false); // Reset the submitting state
        }
    };

    const calculateTotal = () => {
        if (!booking.start_time || !booking.end_time || !parkingSpace?.pricing_info?.base_price) {
            return 0;
        }
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        let price = hours * parkingSpace.pricing_info.base_price;

        if (parkingSpace.pricing_info.dynamic_pricing && parkingSpace.pricing_info.dynamic_pricing_algorithm) {
            switch (parkingSpace.pricing_info.dynamic_pricing_algorithm) {
                case 'peak_hours':
                    price *= 1.2;
                    break;
                case 'off_peak':
                    price *= 0.9;
                    break;
                default:
                    break;
            }
        }

        return price > 0 ? price : 0;
    };

    const isValidDate = (dateString: string) => {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    };

    const renderAvailability = () => {
        if (parkingSpace.availability_schedule && parkingSpace.availability_schedule.length > 0) {
            return parkingSpace.availability_schedule.map((schedule, index) => {
                const { day_of_week, start_time, end_time } = schedule;

                const startDate = isValidDate(start_time) ? new Date(start_time) : null;
                const endDate = isValidDate(end_time) ? new Date(end_time) : null;

                const timeRange = startDate && endDate
                    ? `${format(startDate, 'p')} - ${format(endDate, 'p')}`
                    : 'Invalid time';

                return (
                    <div key={index} className="flex items-center">
                        <Clock className="w-5 h-5 text-blue-500 mr-1" />
                        <span className="text-sm">
                            {day_of_week}: {timeRange}
                        </span>
                    </div>
                );
            });
        }
        return 'No availability schedule';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Loading parking space details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <p className="text-red-500">Error: {error}</p>
                <Button onClick={() => dispatch(fetchParkingSpace(parkingSpaceId))}>
                    Retry
                </Button>
            </div>
        );
    }

    if (!parkingSpace) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>No parking space found.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-md">
            <Card className="shadow-lg">
                <CardHeader className="pb-2 flex items-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push(previousUrl)}
                        className="mr-2"
                        aria-label="Go Back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex flex-col space-y-1.5">
                        <CardTitle className="text-2xl">{parkingSpace.location.address}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="w-4 h-4 mr-1" /> {parkingSpace.location.address}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <Star className="w-5 h-5 text-yellow-400 mr-1" />
                            <span className="font-semibold">{parkingSpace.verification_status}</span>
                        </div>
                        <Badge variant={lockStatus !== 'idle' ? 'destructive' : 'default'}>
                            {lockStatus !== 'idle' ? 'Locked' : 'Available'}
                        </Badge>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <DollarSign className="w-5 h-5 text-green-600 mr-1" />
                                <span className="font-semibold">${parkingSpace.pricing_info?.base_price ?? '???'}/hour</span>
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-5 h-5 text-blue-500 mr-1" />
                                <span className="text-sm">See availability below</span>
                            </div>
                        </div>
                        <ScrollArea className="h-20 rounded-md border p-2">
                            <p className="text-sm text-muted-foreground">{parkingSpace.cancellation_policy}</p>
                        </ScrollArea>
                        <div>
                            <h3 className="font-semibold mb-2 text-sm">Features:</h3>
                            <div className="flex flex-wrap gap-2">
                                {parkingSpace.features?.map((feature: string) => (
                                    <Badge key={feature} variant="outline" className="text-xs">
                                        {feature}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        {/* Optional: Render All Availability Schedules */}
                        <div>
                            <h3 className="font-semibold mb-2 text-sm">Availability:</h3>
                            {renderAvailability()}
                        </div>
                    </div>
                </CardContent>
                <Separator className="my-2" />
                {userReservations.length > 0 && (
                    <CardContent>
                        <h3 className="font-semibold mb-2 text-lg">Your Previous Reservations:</h3>
                        <div className="space-y-2">
                            {userReservations.map((reservation: Reservation) => (
                                <div key={reservation.id} className="text-sm border p-2 rounded-md">
                                    <p>
                                        <strong>Date:</strong>{' '}
                                        {isValidDate(reservation.start_time) ? format(new Date(reservation.start_time), 'PPP') : 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Time:</strong>{' '}
                                        {isValidDate(reservation.start_time) && isValidDate(reservation.end_time)
                                            ? `${format(new Date(reservation.start_time), 'p')} - ${format(new Date(reservation.end_time), 'p')}`
                                            : 'N/A'}
                                    </p>
                                    <p>
                                        <strong>License Plate:</strong>{' '}
                                        {reservation.car_info?.license_plate || 'N/A'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                )}
                <Separator className="my-2" />
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time" className="text-sm font-medium">
                                    Start Date & Time
                                </Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="start_time"
                                        name="start_time"
                                        type="datetime-local"
                                        value={booking.start_time}
                                        onChange={handleChange}
                                        className="pl-10"
                                        min={new Date().toISOString().slice(0,16)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time" className="text-sm font-medium">
                                    End Date & Time
                                </Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="end_time"
                                        name="end_time"
                                        type="datetime-local"
                                        value={booking.end_time}
                                        onChange={handleChange}
                                        className="pl-10"
                                        min={booking.start_time || new Date().toISOString().slice(0,16)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="car_info_id" className="text-sm font-medium">
                                Select Car
                            </Label>
                            <Select
                                name="car_info_id"
                                value={booking.car_info_id}
                                onValueChange={(value) => setBooking((prev: ReservationCreateRequest) => ({ ...prev, car_info_id: value }))}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your car" />
                                </SelectTrigger>
                                <SelectContent>
                                    {carInfos.map((car: CarInfo) => (
                                        <SelectItem key={car.id ?? 'no-id'} value={car.id ?? 'no-id'}>
                                            {`${car.make} ${car.model} (${car.license_plate})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-full flex justify-between items-center mt-4">
                            <div className="text-lg font-semibold">Total:</div>
                            <div className="text-2xl font-bold">${calculateTotal().toFixed(2)}</div>
                        </div>

                        <div className="w-full flex justify-between items-center mt-4">
                            <div className="text-lg font-semibold">Time Left:</div>
                            <div className="text-xl font-bold">
                                {Math.floor(timer / 60000)}:{('0' + Math.floor((timer % 60000) / 1000)).slice(-2)} mins
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full mt-4"
                            size="lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Book Now'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
