'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getAllPendingSpots, verifyParkingSpot } from '@/features/admin/adminSlice';
import ImageWrapper from "@/components/custom/ImageWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Define the type for a pending spot
interface PendingSpot {
    id: string;
    name: string;
    is_paid: boolean;
    photos: string[];
    verification_photos?: string[];
    location?: {
        address?: string;
    };
}

export const VerificationPage = () => {
    const dispatch = useAppDispatch();
    const { pendingSpots, loading, error } = useAppSelector(state => state.admin);

    const [isListExpanded, setIsListExpanded] = useState(true);
    const [selectedSpot, setSelectedSpot] = useState<PendingSpot | null>(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmInput, setConfirmInput] = useState("");
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [expandedImage, setExpandedImage] = useState<string | null>(null); // State for expanded image

    useEffect(() => {
        dispatch(getAllPendingSpots());
    }, [dispatch]);

    const handleVerification = async (spotId: string, is_verified: boolean) => {
        await dispatch(verifyParkingSpot({ spotId, is_verified }));
        dispatch(getAllPendingSpots());
    };

    const toggleListExpansion = () => {
        setIsListExpanded(prev => !prev);
    };

    const openVerificationModal = (spot: PendingSpot) => {
        setSelectedSpot(spot);
        setIsVerificationModalOpen(true);
    };

    const closeVerificationModal = () => {
        setIsVerificationModalOpen(false);
        setSelectedSpot(null);
    };

    const openConfirmModal = (action: "approve" | "reject", spot: PendingSpot) => {
        setSelectedSpot(spot);
        setActionType(action);
        setIsConfirmModalOpen(true);
        setErrorMessage("");
    };

    const closeConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setConfirmInput("");
    };

    const confirmAction = async () => {
        if (confirmInput === "confirm" && selectedSpot) {
            const is_verified = actionType === "approve";
            await handleVerification(selectedSpot.id, is_verified);
            closeConfirmModal();
        } else {
            setErrorMessage("You must type 'confirm' to proceed.");
        }
    };

    const handleImageClick = (image: string) => {
        setExpandedImage(image);
    };

    const closeExpandedImage = () => {
        setExpandedImage(null);
    };

    if (loading) {
        return <p className="text-center text-lg">Loading...</p>;
    }

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

                    {pendingSpots.length === 0 ? (
                        <p className="text-center">No pending verification spots available.</p>
                    ) : (
                        isListExpanded && (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {pendingSpots.slice(0, 10).map((spot: PendingSpot) => (
                                    <motion.div
                                        key={spot.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                            {spot.photos && spot.photos.length > 0 && (
                                                <div className="relative w-full h-40" onClick={() => handleImageClick(spot.photos[0])}>
                                                    <ImageWrapper
                                                        src={spot.photos[0]}
                                                        alt={spot.name || 'Parking Spot Image'}
                                                        layout="fill"
                                                        objectFit="cover"
                                                        className="w-full h-48 object-cover cursor-pointer"
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

                                                {spot.verification_photos && spot.verification_photos.length > 0 && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="mb-4 w-full"
                                                        onClick={() => openVerificationModal(spot)}
                                                    >
                                                        View Verification
                                                    </Button>
                                                )}

                                                <div className="flex justify-between">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="flex-1 mr-2"
                                                        onClick={() => openConfirmModal("approve", spot)}
                                                    >
                                                        Verify
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => openConfirmModal("reject", spot)}
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

            {/* Modal for Expanded Image */}
            {expandedImage && (
                <Dialog open={!!expandedImage} onOpenChange={closeExpandedImage}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Expanded Image</DialogTitle>
                        </DialogHeader>
                        <div className="relative w-full h-96">
                            <ImageWrapper
                                src={expandedImage}
                                alt="Expanded Parking Spot"
                                layout="fill"
                                objectFit="contain"
                            />
                        </div>
                        <Button variant="secondary" className="mt-4" onClick={closeExpandedImage}>
                            Close
                        </Button>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal for Verification Photos */}
            {selectedSpot && (
                <Dialog open={isVerificationModalOpen} onOpenChange={closeVerificationModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Verification Photos</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-4">
                            {selectedSpot.verification_photos?.map((photo: string, index: number) => (
                                <div key={index} className="relative w-full h-60" onClick={() => handleImageClick(photo)}>
                                    <ImageWrapper
                                        src={photo}
                                        alt={`Verification Photo ${index + 1}`}
                                        layout="fill"
                                        objectFit="cover"
                                        className="cursor-pointer"
                                    />
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" className="mt-4" onClick={closeVerificationModal}>
                            Close
                        </Button>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal for Confirm Action */}
            {isConfirmModalOpen && selectedSpot && (
                <Dialog open={isConfirmModalOpen} onOpenChange={closeConfirmModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm {actionType === "approve" ? "Verification" : "Rejection"}</DialogTitle>
                        </DialogHeader>
                        <p className="mb-4">
                            To confirm the {actionType === "approve" ? "approval" : "rejection"} of this parking spot, type "confirm" in the box below.
                        </p>
                        <input
                            type="text"
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            className="border border-gray-300 rounded-md w-full p-2 mb-2 text-black placeholder-gray-500"
                            placeholder="Type 'confirm' to proceed"
                        />
                        {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}
                        <Button variant="secondary" className="mr-4" onClick={confirmAction}>
                            Submit
                        </Button>
                        <Button variant="destructive" onClick={closeConfirmModal}>
                            Cancel
                        </Button>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

export default VerificationPage;