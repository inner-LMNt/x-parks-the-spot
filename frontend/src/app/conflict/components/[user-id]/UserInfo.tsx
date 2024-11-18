"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUserDetails, banUser } from "@/features/admin/adminSlice";
import { toast } from "@/hooks/use-toast";

interface UserInfoProps {
    userId: string;
    onClose: () => void; // Callback to close the modal
}

const UserInfo: React.FC<UserInfoProps> = ({ userId, onClose }) => {
    const dispatch = useAppDispatch();
    const { userDetails, loading } = useAppSelector((state) => state.admin);
    const [banReason, setBanReason] = useState("");
    const [isBanning, setIsBanning] = useState(false);
    const [activeTab, setActiveTab] = useState("pastBookings");

    useEffect(() => {
        if (userId) {
            dispatch(fetchUserDetails(userId));
        }
    }, [dispatch, userId]);

    const handleBanUser = async () => {
        if (!banReason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a rationale for banning this user.",
                variant: "destructive",
            });
            return;
        }

        setIsBanning(true);
        try {
            await dispatch(banUser({ userId, rationale: banReason })).unwrap();
            toast({
                title: "Success",
                description: "User has been banned successfully.",
                variant: "success",
            });
            onClose(); // Close the modal after banning
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to ban user.",
                variant: "destructive",
            });
        } finally {
            setIsBanning(false);
        }
    };

    const renderTabContent = () => {
        if (!userDetails) return <p>No user details available.</p>;

        switch (activeTab) {
            case "pastBookings":
                return (
                    <div className="overflow-y-auto max-h-60">
                        {userDetails.pastBookings?.map((booking: any) => (
                            <div key={booking.id} className="border-b py-2">
                                <p><strong>Spot:</strong> {booking.parkingSpace}</p>
                                <p><strong>Date:</strong> {booking.date}</p>
                            </div>
                        ))}
                    </div>
                );
            case "parkingSpaces":
                return (
                    <div className="overflow-y-auto max-h-60">
                        {userDetails.parkingSpaces?.map((space: any) => (
                            <div key={space.id} className="border-b py-2">
                                <p><strong>Location:</strong> {space.location}</p>
                                <p><strong>Status:</strong> {space.status}</p>
                            </div>
                        ))}
                    </div>
                );
            case "reportsDisputes":
                return (
                    <div className="overflow-y-auto max-h-60">
                        {userDetails.reports?.map((report: any) => (
                            <div key={report.id} className="border-b py-2">
                                <p><strong>Type:</strong> {report.type}</p>
                                <p><strong>Description:</strong> {report.description}</p>
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <p>Loading user details...</p>;
    }

    return (
        <Card className="shadow-lg w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>{userDetails?.name || "Unknown User"}</CardTitle>
                <CardDescription>{userDetails?.email || "No email available"}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 border-b pb-2">
                    <button
                        onClick={() => setActiveTab("pastBookings")}
                        className={`px-4 py-2 ${
                            activeTab === "pastBookings" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"
                        }`}
                    >
                        Past Bookings
                    </button>
                    <button
                        onClick={() => setActiveTab("parkingSpaces")}
                        className={`px-4 py-2 ${
                            activeTab === "parkingSpaces" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"
                        }`}
                    >
                        Parking Spaces
                    </button>
                    <button
                        onClick={() => setActiveTab("reportsDisputes")}
                        className={`px-4 py-2 ${
                            activeTab === "reportsDisputes" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"
                        }`}
                    >
                        Reports/Disputes
                    </button>
                </div>
                <div className="mt-4">{renderTabContent()}</div>
                <div className="mt-4">
                    <Textarea
                        placeholder="Enter ban rationale"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        rows={4}
                        className="w-full"
                    />
                    <Button
                        variant="destructive"
                        onClick={handleBanUser}
                        disabled={isBanning}
                        className="mt-4"
                    >
                        {isBanning ? "Banning..." : "Ban User"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default UserInfo;
