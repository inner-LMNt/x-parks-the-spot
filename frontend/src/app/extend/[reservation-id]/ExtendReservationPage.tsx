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
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Clock, ArrowLeft } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { motion } from "framer-motion";
import {fetchParkingSpace} from "@/features/parking-space/parkingSpaceSlice";

const ExtendReservationPage = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const params = useParams();
    const reservationId = params?.["reservation-id"] ?? "";

    const [newEndTime, setNewEndTime] = useState("");
    const [maxExtensionTime, setMaxExtensionTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const normalizedReservationId = reservationId.toLowerCase();
    const current_spot = useAppSelector((state) => state.parkingSpace.parkingSpace);
    const reservation = useAppSelector((state) => {
        const foundReservation = state.reservations.reservations.find(
            (r) => r.id.toLowerCase() === normalizedReservationId
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
                const resultAction = await dispatch(fetchReservationById(reservationId));
                if (fetchReservationById.fulfilled.match(resultAction)) {
                    dispatch(fetchParkingSpace(reservation.parking_space_id));
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

    // Fetch maximum extension time
    useEffect(() => {
        const fetchMaxExtension = async () => {
            if (reservation) {
                const resultAction = await dispatch(getMaxExtensionTime(reservation.id));
                if (getMaxExtensionTime.fulfilled.match(resultAction)) {
                    const { maxExtensionTime } = resultAction.payload;
                    setMaxExtensionTime(maxExtensionTime);
                } else if (getMaxExtensionTime.rejected.match(resultAction)) {
                    toast({
                        title: "Error",
                        description:
                            resultAction.payload || "Failed to get maximum extension time",
                        variant: "destructive",
                    });
                }
            }
        };
        fetchMaxExtension();
    }, [dispatch, reservation]);

    // Handle submit
    const handleExtendReservation = async (e: React.FormEvent) => {
        e.preventDefault();

        // Input validation (unchanged)

        setIsSubmitting(true);

        const resultAction = await dispatch(
            updateReservation({
                id: reservationId,
                updateData: {
                    end_time: new Date(newEndTime).toISOString() as string,
                },
            })
        );

        setIsSubmitting(false);

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

    // Log reservation details for debugging
    console.log("Reservation:", reservation);
    console.log("Reservation end_time:", reservation.end_time);

    return (
        <motion.div
            className="container mx-auto p-4 max-w-md"
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
                                    format(parseISO(maxExtensionTime), "PPP p")
                                ) : (
                                    "Loading..."
                                )}
              </span>
                        </div>
                        <Separator className="my-2" />
                        <form onSubmit={handleExtendReservation} className="space-y-4">
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
                                                ? reservation.end_time.slice(0, 16)
                                                : undefined
                                        }
                                        max={
                                            maxExtensionTime &&
                                            isValid(parseISO(maxExtensionTime))
                                                ? maxExtensionTime.slice(0, 16)
                                                : undefined
                                        }
                                        disabled={!maxExtensionTime || isSubmitting}
                                        required
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full mt-4"
                                size="lg"
                                disabled={isSubmitting || !maxExtensionTime}
                            >
                                {isSubmitting ? "Extending..." : "Extend Reservation"}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ExtendReservationPage;
