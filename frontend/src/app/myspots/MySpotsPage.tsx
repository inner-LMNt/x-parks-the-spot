'use client'

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {MapPin, Edit, Trash2, Plus, FileCheck2, CheckCircle2, Loader, XCircle, CheckCircle} from 'lucide-react';
import { ParkingSpace } from '@/types/type';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOwnerSpots, deleteParkingSpot } from '@/features/owner/ownerSlice';
import ImageWrapper from "@/components/custom/ImageWrapper";
import VerificationModal from '@/components/custom/VerificationModal'; // Import the verification modal

export default function MySpotsPage() {
    const isLoggedIn = useAppSelector(state => state.user.isLoggedIn);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { paidSpots, freeSpots, pendingSpots, loading, error } = useAppSelector(state => state.owner);

    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [currentSpotId, setCurrentSpotId] = useState<string | null>(null);

    useEffect(() => {
        if (isLoggedIn) {
            dispatch(getOwnerSpots());
        }
    }, [dispatch, isLoggedIn]);

    const handleDelete = (id: string) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this parking spot?");
        if (confirmDelete) {
            dispatch(deleteParkingSpot(id));
        }
    };

    const emptySpots = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-center items-center h-64 w-full bg-white rounded-lg shadow-md"
        >
            <MapPin className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No spots available</p>
            <Link href="/add" className="mt-4">
                <Button variant="outline" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Spot
                </Button>
            </Link>
        </motion.div>
    )

    const openVerificationModal = (spotId: string) => {
        setCurrentSpotId(spotId);
        setVerificationModalOpen(true);
    };

    const closeVerificationModal = () => {
        setVerificationModalOpen(false);
        setCurrentSpotId(null);
    };

    const getVerificationStatusIcon = (spot: ParkingSpace) => {
        if (!spot.is_verified) {
            return <XCircle className="w-6 h-6 text-red-500" title="Not Verified" />;
        }
        if (spot.is_verified === 'pending') {
            return <Loader className="w-6 h-6 text-yellow-500" title="Pending Verification" />;
        }
        return <CheckCircle className="w-6 h-6 text-green-500" title="Verified" />;
    };

    const renderSpots = (spots: ParkingSpace[]) => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
                <motion.div key={spot.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">

                        {/* Display Image if Exists */}
                        {spot.photos && (
                            <div className="relative w-full h-40">
                                <ImageWrapper
                                    src={spot.photos[0]} // Can be relative; ImageWrapper handles absolute URL
                                    alt={spot.name || 'Parking Spot Image'}
                                    layout="fill"
                                    objectFit="cover"
                                    className="w-full h-48 object-cover"
                                />
                            </div>
                        )}

                        <CardHeader className="bg-gray-50">
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center space-x-2">
                                    <MapPin className={`w-5 h-5 ${spot.is_paid ? 'text-green-500' : 'text-blue-500'}`} />
                                    <span>{spot.name || (spot.is_paid ? "Unnamed Spot" : "Free Spot")}</span>
                                </CardTitle>
                            </div>

                            <CardDescription>
                                {/* Display Address if Exists, else Latitude and Longitude */}
                                {spot.location?.address ? (
                                    <span className="text-sm text-gray-600">{spot.location.address}</span>
                                ) : (
                                    spot.location ? `${spot.location.latitude.toFixed(4)}, ${spot.location.longitude.toFixed(4)}` : 'Location not available'
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">

                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium">{spot.is_paid ? 'Paid' : 'Free'}</span>
                                <span className={`text-sm font-medium ${spot.availability_schedule && spot.availability_schedule.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {spot.is_paid ?
                      (spot.availability_schedule && spot.availability_schedule.length > 0 ? 'Available' : 'Unavailable')
                      : 'Always Available'}
                </span>
                            </div>
                            {/* Display price and verification icon */}
                            {spot.is_paid && spot.pricing_info && (
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-lg font-bold">${spot.pricing_info.base_price}/hour</p>
                                    {getVerificationStatusIcon(spot)} {/* Verification status icon */}
                                </div>
                            )}
                            <div className="flex justify-between">
                                <Button variant="outline" size="sm" className="flex-1 mr-2" onClick={() => router.push(`/edit/${spot.id}`)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(spot.id as string)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                            {/* Verification Status */}
                            {!spot.is_verified && spot.is_paid && (
                                <Button
                                    onClick={() => openVerificationModal(spot.id)}
                                    className="mt-2 w-full bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300 hover:text-gray-900 transition-colors"
                                    variant="outline"
                                >
                                    <FileCheck2 className="w-4 h-4 mr-2" />
                                    Submit Verification
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white shadow-md rounded-lg p-6 mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2 text-black">My Parking Spots</h1>
                    <p className="text-gray-600 mb-6">Manage and track your parking locations</p>

                    {loading ? (
                        <p>Loading...</p>
                    ) : error ? (
                        <p className="text-red-500">Error: {error}</p>
                    ) : (paidSpots.length === 0 && freeSpots.length === 0 && pendingSpots.length === 0) ? (
                        emptySpots
                    ) : (
                        <>
                            {freeSpots.length > 0 && (
                                <>
                                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Free Spots</h2>
                                    {renderSpots(freeSpots)}
                                </>
                            )}

                            {paidSpots.length > 0 && (
                                <>
                                    <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">Paid Spots</h2>
                                    {renderSpots(paidSpots)}
                                </>
                            )}

                            {pendingSpots.length > 0 && (
                                <>
                                    <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">Pending Spots</h2>
                                    {renderSpots(pendingSpots)}
                                </>
                            )}
                        </>
                    )}

                    {(freeSpots.length > 0 || paidSpots.length > 0 || pendingSpots.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="mt-8"
                        >
                            <Link href="/add">
                                <Button className="w-full sm:w-auto">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Spot
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Verification Modal */}
            {currentSpotId && (
                <VerificationModal
                    isOpen={verificationModalOpen}
                    onClose={closeVerificationModal}
                    spotId={currentSpotId}
                />
            )}
        </div>
    );
}
