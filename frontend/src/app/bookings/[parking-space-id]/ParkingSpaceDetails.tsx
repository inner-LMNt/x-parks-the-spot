// src/app/bookings/[parking-space-id]/ParkingSpaceDetails.tsx

"use client";

import React, { useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, DollarSign, Clock, Star, ArrowLeft } from 'lucide-react'; // Imported ArrowLeft
import { format } from 'date-fns';
import { fetchParkingSpace, resetError, lockParkingSpace } from '@/features/parking-space/parkingSpaceSlice'; // Import lockParkingSpace
import { toast } from '@/hooks/use-toast'; // Assuming you have a toast hook

export default function ParkingSpaceDetails() {
    const params = useParams();
    const parkingSpaceId = params?.['parking-space-id'] as string ?? "invalid" ;
    const router = useRouter();
    const dispatch = useAppDispatch();
    const currentUrl = usePathname();

    // Selectors from the parkingSpace slice
    const parkingSpace = useAppSelector((state) => state.parkingSpace.parkingSpace);
    const lockStatus = useAppSelector((state) => state.parkingSpace.lockStatus);
    const loading = useAppSelector((state) => state.parkingSpace.loading);
    const error = useAppSelector((state) => state.parkingSpace.error);

    useEffect(() => {
        if (parkingSpaceId) {
            //@ts-ignore
            dispatch(fetchParkingSpace(parkingSpaceId));
        }

        // Optional: Cleanup on unmount
        return () => {
            dispatch(resetError());
        };
    }, [dispatch, parkingSpaceId]);

    const handleReserveAndLock = async () => {
        router.push(`/bookings/${parkingSpaceId}/reserve?previousUrl=${encodeURIComponent(currentUrl ?? '/bookings')}`);
    };

    const handleBack = () => {
        router.push('/bookings');
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
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="mr-2"
                        aria-label="Go Back to Bookings"
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
                                <span className="font-semibold">${parkingSpace?.pricing_info?.base_price ?? '???'}/hour</span>
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-5 h-5 text-blue-500 mr-1" />
                                <span className="text-sm">
                                    {parkingSpace.availability_schedule?.length ?? -1 > 0 ? (
                                        <>
                                            { /* @ts-ignore */ }
                                            {format(new Date(parkingSpace.availability_schedule[0].start_time), 'p')} -{' '}
                                            { /* @ts-ignore */ }
                                            {format(new Date(parkingSpace.availability_schedule[0].end_time), 'p')}
                                        </>
                                    ) : (
                                        'No availability schedule'
                                    )}
                                </span>
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
                    </div>
                </CardContent>
                <Separator className="my-2" />
                <CardContent>
                    <Button
                        onClick={handleReserveAndLock}
                        className="w-full"
                        size="lg"
                        disabled={lockStatus === 'locking' || lockStatus === 'locked'}
                    >
                        {lockStatus === 'locking' ? 'Locking...' : 'Reserve & Lock'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
