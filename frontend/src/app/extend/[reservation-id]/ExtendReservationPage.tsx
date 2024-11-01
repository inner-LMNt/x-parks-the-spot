"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    updateReservation,
    getMaxExtensionTime,
    fetchReservationById,
} from "@/features/reservations/reservationsSlice";
import { useRouter, useParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Clock, ArrowLeft } from "lucide-react";
import { format, parseISO, isValid, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { fetchParkingSpace } from "@/features/parking-space/parkingSpaceSlice";
import {Reservation} from "@/types/type";

// Removed ShadCN Dialog Imports

const ExtendReservationPage = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const params = useParams();
    const reservationId = (params?.["reservation-id"] ?? "") as string;

    const [newEndTime, setNewEndTime] = useState("");
    const [maxExtensionTime, setMaxExtensionTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [totalPrice, setTotalPrice] = useState(0); // State for total price

    // State to control the confirmation card visibility
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

    // Select current_spot from Redux store
    const current_spot = useAppSelector((state) => state.parkingSpace.parkingSpace);

    // Select reservation from Redux store with normalized ID
    const reservation = useAppSelector((state) => {
        const foundReservation = state.reservations.reservations.find(
            (r: Reservation) => r.id === reservationId
        );
        return foundReservation;
    });

    // Fetch reservation details if not in store
    useEffect(() => {
        const fetchReservation = async () => {
            if (!reservationId) {
                toast({
                    title: "Error",
                    description: "Reservation ID not provided",
                    variant: "destructive",
                });
                setIsLoading(false);
                return;
            }

            if (!reservation) {
                setIsLoading(true);
                // @ts-ignore
                const resultAction = await dispatch(fetchReservationById(reservationId));
                if (fetchReservationById.fulfilled.match(resultAction)) {
                    const fetchedReservation = resultAction.payload;
                    console.log("Fetched Reservation:", fetchedReservation);
                    // @ts-ignore
                    dispatch(fetchParkingSpace(fetchedReservation.parking_space_id));
                } else if (fetchReservationById.rejected.match(resultAction)) {
                    toast({
                        title: "Error",
                        description:
                            resultAction.payload || "Failed to fetch reservation details",
                        variant: "destructive",
                    });
                }
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        };
        fetchReservation();
    }, [dispatch, reservationId, reservation]);

    // Initialize newEndTime when reservation is available
    useEffect(() => {
        if (reservation && !newEndTime) {
            const formattedCurrentEnd = format(new Date(reservation.end_time), "yyyy-MM-dd'T'HH:mm");
            setNewEndTime(formattedCurrentEnd);
            console.log("Default newEndTime set to:", formattedCurrentEnd);
        }
    }, [reservation, newEndTime]);

    // Fetch maximum extension time
    useEffect(() => {
        const fetchMaxExtension = async () => {
            if (reservation) {
                // @ts-ignore
                const resultAction = await dispatch(getMaxExtensionTime(reservation.id));
                if (getMaxExtensionTime.fulfilled.match(resultAction)) {
                    const { maxExtensionTime } = resultAction.payload;
                    setMaxExtensionTime(maxExtensionTime);
                    console.log("Max Extension Time:", maxExtensionTime);
                } else if (getMaxExtensionTime.rejected.match(resultAction)) {
                    toast({
                        title: "Error",
                        description:
                            "There is no availability to extend this reservation",
                        variant: "destructive",
                    });
                    router.push("/bookings");
                }
            }
        };
        fetchMaxExtension();
    }, [dispatch, reservation, router]);

    // Calculate total price whenever newEndTime changes
    useEffect(() => {
        if (newEndTime && reservation && current_spot?.pricing_info?.base_price) {
            const currentEnd = new Date(reservation.end_time);
            const newEnd = new Date(newEndTime);

            console.log("New End Time:", newEndTime);
            console.log("Parsed Current End Time:", currentEnd);
            console.log("Parsed New End Time:", newEnd);
            console.log(
                "Is New End Valid and After Current End:",
                isValid(currentEnd) && isValid(newEnd) && newEnd > currentEnd
            );

            if (isValid(currentEnd) && isValid(newEnd) && newEnd > currentEnd) {
                const minutesDifference = differenceInMinutes(newEnd, currentEnd);
                const hoursDifference = minutesDifference / 60;
                const calculatedPrice = Math.round(hoursDifference * current_spot.pricing_info.base_price * 100) / 100;
                setTotalPrice(calculatedPrice);
                console.log("Minutes Difference:", minutesDifference);
                console.log("Hours Difference:", hoursDifference);
                console.log("Calculated Price:", calculatedPrice);
            } else {
                setTotalPrice(0);
                console.log("Invalid new end time. Total Price set to 0.");
            }
        } else {
            setTotalPrice(0);
            console.log("New end time, reservation, or base price missing. Total Price set to 0.");
        }
    }, [newEndTime, reservation, current_spot]);

    // Handle actual reservation extension
    const handleConfirmExtend = async () => {
        setIsSubmitting(true);
        // @ts-ignore
        const resultAction = await dispatch(
            updateReservation({
                id: reservationId,
                updateData: {
                    end_time: new Date(newEndTime).toISOString(),
                },
            })
        );

        setIsSubmitting(false);
        setIsConfirmationVisible(false); // Hide the confirmation card after submission

        if (updateReservation.fulfilled.match(resultAction)) {
            toast({
                title: "Success",
                description: "Reservation extended successfully",
                variant: "success",
            });
            router.push("/bookings");
        } else if (updateReservation.rejected.match(resultAction)) {
            toast({
                title: "Error",
                description:
                    resultAction.payload || "Failed to extend reservation",
                variant: "destructive",
            });
        }
    };

    // Handle form submission: Open the confirmation card instead of a dialog
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Input validation
        if (!newEndTime) {
            toast({
                title: "Error",
                description: "Please select a new end time.",
                variant: "destructive",
            });
            return;
        }

        const currentEnd = new Date(reservation.end_time);
        const selectedEnd = new Date(newEndTime);

        if (!isValid(selectedEnd) || selectedEnd <= currentEnd) {
            toast({
                title: "Error",
                description: "Please select a valid end time later than the current end time.",
                variant: "destructive",
            });
            return;
        }

        if (totalPrice === 0) {
            toast({
                title: "Error",
                description: "Total price cannot be zero.",
                variant: "destructive",
            });
            return;
        }

        // Open the confirmation card
        setIsConfirmationVisible(true);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 max-w-md">
                <Skeleton className="h-10 w-1/2 mb-4" />
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Reservation not found.</p>
            </div>
        );
    }

    // Log reservation and parking spot details for debugging
    console.log("Reservation:", reservation);
    console.log("Reservation end_time:", reservation.end_time);
    console.log("Current Spot Pricing Info:", current_spot?.pricing_info);
    console.log("Base Price:", current_spot?.pricing_info?.base_price);
    console.log("newEndTime:", newEndTime);
    console.log("totalPrice:", totalPrice);

    return (
        <motion.div
            className="container mx-auto p-4 max-w-md relative"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="shadow-lg">
                <CardHeader className="pb-2 flex items-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mr-2"
                        aria-label="Go Back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex flex-col space-y-2">
                        <CardTitle className="text-2xl">Extend Reservation</CardTitle>
                        <CardDescription>
                            Extend the end date and time of the reservation.
                        </CardDescription>
                        <div className="flex items-center">
                            <MapPin className="w-5 h-5 text-blue-500 mr-1" />
                            <span className="text-sm">
                                {current_spot.location.address}, {current_spot.name}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-blue-500 mr-1" />
                            <span className="text-sm">
                                Current End Time: {reservation.end_time ? format(new Date(reservation.end_time), 'PPP p') : 'Loading...'}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-blue-500 mr-1" />
                            <span className="text-sm">
                                Maximum Extension Time:{" "}
                                {maxExtensionTime &&
                                isValid(parseISO(maxExtensionTime)) ? (
                                    format(new Date(maxExtensionTime), "PPP p")
                                ) : (
                                    "Loading..."
                                )}
                            </span>
                        </div>
                        <Separator className="my-2" />
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new_end_time" className="text-sm font-medium">
                                    New End Date & Time
                                </Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="new_end_time"
                                        name="new_end_time"
                                        type="datetime-local"
                                        value={newEndTime}
                                        onChange={(e) => setNewEndTime(e.target.value)}
                                        className="pl-10"
                                        min={
                                            reservation.end_time &&
                                            isValid(parseISO(reservation.end_time))
                                                ? format(new Date(reservation.end_time), "yyyy-MM-dd'T'HH:mm")
                                                : undefined
                                        }
                                        max={
                                            maxExtensionTime &&
                                            isValid(parseISO(maxExtensionTime))
                                                ? format(new Date(maxExtensionTime), "yyyy-MM-dd'T'HH:mm")
                                                : undefined
                                        }
                                        disabled={!maxExtensionTime || isSubmitting}
                                        required
                                    />
                                </div>
                            </div>
                            {/* Display Total Price */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Total Price to Extend</Label>
                                <div className="flex items-center">
                                    <span className="text-lg font-semibold">
                                        ${totalPrice.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full mt-4"
                                size="lg"
                                disabled={isSubmitting || !maxExtensionTime || totalPrice === 0}
                            >
                                {isSubmitting ? "Extending..." : "Extend Reservation"}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>

            {/* Confirmation Card */}
            {isConfirmationVisible && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                    <Card className="w-11/12 max-w-md p-4">
                        <CardHeader>
                            <CardTitle>Confirm Extension</CardTitle>
                            <CardDescription>
                                Please review the details below before confirming the extension.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium">Current End Time:</span>
                                <span>
                                    {reservation.end_time
                                        ? format(new Date(reservation.end_time), 'PPP p')
                                        : 'Loading...'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">New End Time:</span>
                                <span>
                                    {newEndTime
                                        ? format(new Date(newEndTime), 'PPP p')
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Total Price:</span>
                                <span>${totalPrice.toFixed(2)}</span>
                            </div>
                        </CardContent>
                        <div className="flex justify-end space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsConfirmationVisible(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmExtend}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Extending..." : "Confirm"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </motion.div>
    );
};

export default ExtendReservationPage;
