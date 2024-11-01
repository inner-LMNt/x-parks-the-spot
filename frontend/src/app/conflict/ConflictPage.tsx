'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ChevronDown, ChevronUp, Tag, ShieldCheck, ShieldX, ShieldEllipsis } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getAllConflicts, updateConflictResponse } from '@/features/admin/adminSlice';
import { fetchParkingSpace } from '@/features/parking-space/parkingSpaceSlice';
import { toast } from '@/hooks/use-toast';
import ImageWrapper from "@/components/custom/ImageWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Conflict {
    id: string;
    description: string;
    type: "Other" | "Technical" | "Billing";
    status: "open" | "in_progress" | "resolved";
    admin_response: string | null;
    created_at: string;
    updated_at: string;
    owner_name: string;
    parking_space_name: string;
    parking_space_address: string;
    parking_space_id: string;
}

const ConflictPage = () => {
    const dispatch = useAppDispatch();
    const { conflicts = [], loading, error } = useAppSelector(state => state.admin);
    const [expandedConflictId, setExpandedConflictId] = useState<string | null>(null);
    const [responseText, setResponseText] = useState<{ [key: string]: string }>({});
    const [parkingSpaceData, setParkingSpaceData] = useState<{ [key: string]: any }>({});
    const [selectedImage, setSelectedImage] = useState<string | null>(null); // State to manage expanded image

    useEffect(() => {
        dispatch(getAllConflicts());
    }, [dispatch]);

    const toggleConflict = (id: string, parkingSpaceId: string) => {
        setExpandedConflictId(expandedConflictId === id ? null : id);

        if (!parkingSpaceData[parkingSpaceId]) {
            dispatch(fetchParkingSpace(parkingSpaceId))
                .unwrap()
                .then((data) => setParkingSpaceData((prev) => ({ ...prev, [parkingSpaceId]: data })))
                .catch(() => {
                    toast({
                        title: "Error",
                        description: "Failed to fetch parking space details.",
                        variant: "error",
                    });
                });
        }
    };

    const handleImageClick = (imageSrc: string) => {
        setSelectedImage(imageSrc);
    };

    const handleResponseSubmit = async (id: string) => {
        const response = responseText[id];
        if (response && response.trim()) {
            await dispatch(updateConflictResponse({ id, response }))
                .unwrap()
                .then(() => {
                    toast({
                        title: "Response Sent",
                        description: "The conflict response has been updated.",
                        variant: "success",
                    });
                    dispatch(getAllConflicts());
                    setResponseText((prev) => ({ ...prev, [id]: "" }));
                })
                .catch((error) => {
                    toast({
                        title: "Error",
                        description: error,
                        variant: "error",
                    });
                });
        }
    };

    const getVerificationStatusIcon = (status: string) => {
        if (status === 'verified') return <ShieldCheck className="w-6 h-6 text-green-500" title="Verified" />;
        if (status === 'pending') return <ShieldEllipsis className="w-6 h-6 text-yellow-500" title="Pending Verification" />;
        return <ShieldX className="w-6 h-6 text-red-500" title="Not Verified" />;
    };

    if (loading) return <p className="text-center text-lg">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">Error: {error}</p>;

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <h1 className="text-3xl font-bold mb-4 text-black">Conflict Management</h1>
                {conflicts.length === 0 ? (
                    <p className="text-center text-gray-800">No conflicts available.</p>
                ) : (
                    <div className="space-y-4">
                        {conflicts.slice(0, 10).map((conflict) => (
                            <Card key={conflict.id} className="shadow-lg">
                                <CardHeader
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleConflict(conflict.id, conflict.parking_space_id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-blue-500" />
                                                <CardTitle className="text-xl text-slate-950">{conflict.description}</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(conflict.created_at).toLocaleDateString()}</span>
                                                <Tag className="w-4 h-4" />
                                                <span>{conflict.parking_space_address || "Location not available"}</span>
                                            </div>
                                        </div>
                                        {expandedConflictId === conflict.id ? (
                                            <ChevronUp className="w-5 h-5 text-slate-700" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-700" />
                                        )}
                                    </div>
                                </CardHeader>
                                <AnimatePresence>
                                    {expandedConflictId === conflict.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <CardContent className="bg-slate-50 space-y-6 py-2">
                                                <div className="space-y-4">
                                                    {parkingSpaceData[conflict.parking_space_id] && (
                                                        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
                                                            <h3 className="text-lg font-bold mb-2">Parking Space Details</h3>
                                                            {parkingSpaceData[conflict.parking_space_id]?.photos?.[0] && (
                                                                <div className="relative w-full h-40" onClick={() => handleImageClick(parkingSpaceData[conflict.parking_space_id].photos[0])}>
                                                                    <ImageWrapper
                                                                        src={parkingSpaceData[conflict.parking_space_id].photos[0]}
                                                                        alt="Parking Space Image"
                                                                        layout="fill"
                                                                        objectFit="cover"
                                                                        className="w-full h-40 object-cover rounded-md mb-4 cursor-pointer"
                                                                    />
                                                                </div>
                                                            )}
                                                            <p><strong>Name:</strong> {parkingSpaceData[conflict.parking_space_id].name}</p>
                                                            <p><strong>Address:</strong> {parkingSpaceData[conflict.parking_space_id].location.address}</p>
                                                            <div className="flex items-center gap-2">
                                                                {getVerificationStatusIcon(parkingSpaceData[conflict.parking_space_id].verification_status)}
                                                                <span>Verification Status</span>
                                                            </div>
                                                            <p><strong>Latitude:</strong> {parkingSpaceData[conflict.parking_space_id].latitude}</p>
                                                            <p><strong>Longitude:</strong> {parkingSpaceData[conflict.parking_space_id].longitude}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Response input and submit button */}
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={responseText[conflict.id] || ""}
                                                        onChange={(e) => setResponseText((prev) => ({ ...prev, [conflict.id]: e.target.value }))}
                                                        placeholder="Enter your response..."
                                                        className="w-full p-2 border border-gray-300 rounded-md text-black"
                                                    />
                                                    <Button onClick={() => handleResponseSubmit(conflict.id)}>
                                                        Submit Response
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Modal for Expanded Image */}
            {selectedImage && (
                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Expanded Image</DialogTitle>
                        </DialogHeader>
                        <div className="relative w-full h-96">
                            <ImageWrapper
                                src={selectedImage}
                                alt="Expanded Parking Space Image"
                                layout="fill"
                                objectFit="contain"
                            />
                        </div>
                        <Button variant="secondary" className="mt-4" onClick={() => setSelectedImage(null)}>
                            Close
                        </Button>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default ConflictPage;
