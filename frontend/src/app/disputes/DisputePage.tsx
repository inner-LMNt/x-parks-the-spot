'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getDisputeRequests, resolveDisputeRequest } from '@/features/admin/adminSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

// Updated type for a dispute request
interface DisputeRequest {
    id: string;
    disputeType: string;
    user: string;
    message: string;
    parkingSpace?: {
        id: string;
        name: string;
        address: string;
    };
}

export default function AdminDisputesPage() {
    const dispatch = useAppDispatch();
    const { disputeRequests = [], loading, error } = useAppSelector(state => state.admin); // Default empty array for safety
    const [selectedRequest, setSelectedRequest] = useState<DisputeRequest | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

    useEffect(() => {
        dispatch(getDisputeRequests());
    }, [dispatch]);

    const openConfirmModal = (action: "approve" | "reject", request: DisputeRequest) => {
        setSelectedRequest(request);
        setActionType(action);
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setSelectedRequest(null);
    };

    const confirmAction = async () => {
        if (selectedRequest) {
            await dispatch(resolveDisputeRequest({ requestId: selectedRequest.id, action: actionType }));
            closeConfirmModal();
        }
    };

    if (loading) return <p className="text-center text-lg">Loading...</p>;

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white shadow-md rounded-lg p-6 mb-8"
                >
                    <h1 className="text-2xl font-bold mb-4 text-gray-800">User Disputes & Cancellations</h1>

                    {/* Display error if there's an issue fetching disputes */}
                    {error ? (
                        <p className="text-red-500 text-center">Error loading disputes: {error}</p>
                    ) : disputeRequests.length === 0 ? (
                        <p className="text-center text-lg text-gray-600">No disputes or cancellations available at this time.</p>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                            {disputeRequests.slice(0, 10).map((request: DisputeRequest) => (
                                <motion.div key={request.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                        <CardHeader className="bg-gray-50">
                                            {/* Display dispute type and user */}
                                            <CardTitle className="text-xl font-semibold">
                                                {request.disputeType === 'cancellation' ? 'Cancellation Request' : 'Complaint'}
                                            </CardTitle>
                                            <CardDescription>User: {request.user}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            {/* Display user message */}
                                            <p className="text-gray-800 mb-2"><strong>Message:</strong> {request.message}</p>

                                            {/* Display linked parking space details if available */}
                                            {request.parkingSpace && (
                                                <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                                                    <h3 className="font-semibold text-gray-700 mb-1">Linked Parking Spot</h3>
                                                    <div className="flex items-center space-x-2">
                                                        <MapPin className="w-4 h-4 text-blue-500" />
                                                        <p className="text-gray-700">
                                                            {request.parkingSpace.name || 'Unnamed Spot'}
                                                        </p>
                                                    </div>
                                                    <p className="text-gray-600 text-sm">{request.parkingSpace.address || 'Address not available'}</p>
                                                </div>
                                            )}

                                            <div className="flex justify-between mt-4">
                                                <Button variant="default" size="sm" onClick={() => openConfirmModal("approve", request)}>
                                                    Approve
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => openConfirmModal("reject", request)}>
                                                    Reject
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Modal for Confirm Action */}
            {isConfirmModalOpen && selectedRequest && (
                <Dialog open={isConfirmModalOpen} onOpenChange={closeConfirmModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm {actionType === "approve" ? "Approval" : "Rejection"}</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to {actionType} this request?</p>
                        <div className="mt-4 flex justify-end space-x-4">
                            <Button variant="secondary" onClick={confirmAction}>Confirm</Button>
                            <Button variant="destructive" onClick={closeConfirmModal}>Cancel</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
