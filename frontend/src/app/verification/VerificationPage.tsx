'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getAllPendingSpots, verifyParkingSpot } from '@/features/owner/ownerSlice';
import ImageWrapper from "@/components/custom/ImageWrapper";

export default function VerificationPage() {
    const dispatch = useAppDispatch();
    const { pendingSpots, loading, error } = useAppSelector(state => state.owner);
    const [isListExpanded, setIsListExpanded] = useState(true); // Expand/collapse list of parking spots

    // Fetch pending spots when the component mounts
    useEffect(() => {
        dispatch(getAllPendingSpots());
    }, [dispatch]);

    // Handle verification of parking spots
    const handleVerification = async (spotId: string, is_verified: boolean) => {
        await dispatch(verifyParkingSpot({ spotId, is_verified }));
        dispatch(getAllPendingSpots()); // Re-fetch spots after updating verification status
    };

    // Toggle list of parking spots
    const toggleListExpansion = () => {
        setIsListExpanded(!isListExpanded);
    };

    // Handle loading state
    if (loading) {
        return <p className="text-center text-lg">Loading...</p>;
    }

    // Handle error state
    if (error) {
        return <p className="text-red-500 text-center">Error: {error}</p>;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white shadow-md rounded-lg p-6 mb-8"
                >
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold mb-2 text-black">Pending Verification Parking Spots</h1>
                        <Button variant="ghost" onClick={toggleListExpansion}>
                            {isListExpanded ? "Collapse" : "Expand"} List
                        </Button>
                    </div>

                    {pendingSpots && pendingSpots.length === 0 ? (
                        <p className="text-center">No pending verification spots available.</p>
                    ) : (
                        isListExpanded && (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {pendingSpots.map((spot) => (
                                    <motion.div
                                        key={spot.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                            {spot.photos && (
                                                <div className="relative w-full h-40">
                                                    <ImageWrapper
                                                        src={spot.photos[0]}
                                                        alt={spot.name || 'Parking Spot Image'}
                                                        layout="fill"
                                                        objectFit="cover"
                                                        className="w-full h-48 object-cover"
                                                    />
                                                </div>
                                            )}

                                            <CardHeader className="bg-gray-50">
                                                <CardTitle className="flex items-center space-x-2">
                                                    <MapPin className="w-5 h-5 text-blue-500" />
                                                    <span>{spot.name || "Unnamed Spot"}</span>
                                                </CardTitle>
                                                <CardDescription>
                                                    {spot.location?.address || 'Location not available'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-sm font-medium">{spot.is_paid ? 'Paid' : 'Free'}</span>
                                                </div>

                                                <div className="flex justify-between">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="flex-1 mr-2"
                                                        onClick={() => handleVerification(spot.id, true)}
                                                    >
                                                        Verify
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleVerification(spot.id, false)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )
                    )}
                </motion.div>
            </div>
        </div>
    );
}
