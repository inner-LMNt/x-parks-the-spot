'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    Car,
    DollarSign,
    MapPin,
    Star,
    Clock,
    Camera,
    Award
} from 'lucide-react';

// Example static data
const userData = {
    isLoggedIn: true,
    name: "John Doe",
    email: "john@example.com",
    permissions: {
        canRent: true,
        canList: true,
        canSpot: true
    }
};

const bookings = [
    { id: 1, date: '2023-09-15', location: 'Downtown Parking', duration: '2 hours', cost: 15 },
    { id: 2, date: '2023-09-18', location: 'Airport Long-Term', duration: '3 days', cost: 60 },
    { id: 3, date: '2023-09-20', location: 'Shopping Center', duration: '4 hours', cost: 8 },
];

const listings = [
    { id: 1, location: 'Home Driveway', availability: 'Weekends', rate: '5/hour' },
    { id: 2, location: 'Office Parking Lot', availability: 'Weeknights', rate: '3/hour' },
    { id: 3, location: 'Beach Parking Spot', availability: 'Anytime', rate: '10/hour' },
];

const spottedSpots = [
    { id: 1, location: 'Main St & 5th Ave', reportedAt: '2023-09-10 14:30', status: 'Verified' },
    { id: 2, location: 'Central Park West', reportedAt: '2023-09-12 09:15', status: 'Pending' },
    { id: 3, location: 'Broadway & 42nd St', reportedAt: '2023-09-14 18:45', status: 'Verified' },
];

const bookingData = [
    { date: '2023-01', bookings: 12 },
    { date: '2023-02', bookings: 19 },
    { date: '2023-03', bookings: 3 },
    { date: '2023-04', bookings: 5 },
    { date: '2023-05', bookings: 2 },
    { date: '2023-06', bookings: 3 },
];

export default function Dashboard() {
    if (!userData.isLoggedIn) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold mb-6">ParkingPass Dashboard</h1>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        {userData.permissions.canList && <TabsTrigger value="listings">My Listings</TabsTrigger>}
                        {userData.permissions.canRent && <TabsTrigger value="bookings">My Bookings</TabsTrigger>}
                        {userData.permissions.canSpot && <TabsTrigger value="spots">Spotted Spots</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="overview">
                        <Card>
                            <CardHeader>
                                <CardTitle>Booking Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={bookingData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="bookings" stroke="#8884d8" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {userData.permissions.canList && (
                        <TabsContent value="listings" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>My Parking Spaces</CardTitle>
                                    <CardDescription>Manage and monitor your listed parking spaces</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {listings.map((listing) => (
                                            <li key={listing.id} className="flex justify-between items-center border-b pb-2">
                                                <span>{listing.location}</span>
                                                <span>{listing.availability}</span>
                                                <span>${listing.rate}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button className="mt-4">Add New Listing</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {userData.permissions.canRent && (
                        <TabsContent value="bookings" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>My Bookings</CardTitle>
                                    <CardDescription>View and manage your parking reservations</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {bookings.map((booking) => (
                                            <li key={booking.id} className="flex justify-between items-center border-b pb-2">
                                                <span>{booking.date}</span>
                                                <span>{booking.location}</span>
                                                <span>{booking.duration}</span>
                                                <span>${booking.cost}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button className="mt-4">Find Parking</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}

                    {userData.permissions.canSpot && (
                        <TabsContent value="spots" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Spotted Parking Spaces</CardTitle>
                                    <CardDescription>Track the parking spaces you've reported</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {spottedSpots.map((spot) => (
                                            <li key={spot.id} className="flex justify-between items-center border-b pb-2">
                                                <span>{spot.location}</span>
                                                <span>{spot.reportedAt}</span>
                                                <span className={spot.status === 'Verified' ? 'text-green-500' : 'text-yellow-500'}>
                                                    {spot.status}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button className="mt-4">Report New Spot</Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </motion.div>
        </div>
    );
}