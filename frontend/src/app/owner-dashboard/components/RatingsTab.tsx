'use client';

import React, {useState} from 'react';
import {Star} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'; // Adjust the import path
import { MapPin } from "lucide-react";

interface RatingDistribution {
    stars: number;
    count: number;
    percentage: number;
}

interface RatingsBySpot {
    spotId: string;
    spotName: string;
    availabilityRating: number;
    cleanlinessRating: number;
    totalRating: number;
    ratingCount: number;
    ratingDistribution: RatingDistribution[];
    recentReviews: any[];
}

interface RatingMetrics {
    averageRatings: {
        availability: number;
        cleanliness: number;
        total: number;
    };
    totalRatings: number;
    ratingsBySpot: RatingsBySpot[];
}

interface RatingsTabProps {
    ratingMetrics?: RatingMetrics; // Made optional
}
interface ParkingSpotCardProps {
    spotName: string;
    onClose: () => void;
}

const ParkingSpotCard: React.FC<ParkingSpotCardProps> = ({ spotName, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
        >
            <div className="bg-white p-4 rounded-lg shadow-lg relative w-80">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                >
                    &times;
                </button>
                <h2 className="text-lg font-semibold text-slate-950">{spotName}</h2>
            </div>
        </motion.div>
    );
};

const RatingsTab: React.FC<RatingsTabProps> = ({ ratingMetrics }) => {
    const [isCardOpen, setCardOpen] = useState(false);

    const openCard = () => setCardOpen(true);
    const closeCard = () => setCardOpen(false);

    if (!ratingMetrics) {
        return <p className="text-gray-500">No rating metrics available.</p>;
    }

    const {averageRatings, totalRatings, ratingsBySpot} = ratingMetrics;

    return (
        <div className="space-y-6">
            {/* Overall Ratings */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-slate-950">Overall Ratings</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-gray-600">Availability</p>
                        <p className="text-2xl font-bold text-slate-950">{Number(averageRatings.availability).toFixed(1)} / 5</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Cleanliness</p>
                        <p className="text-2xl font-bold text-slate-950">{Number(averageRatings.cleanliness).toFixed(1)} / 5</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Overall</p>
                        <p className="text-2xl font-bold text-slate-950">{Number(averageRatings.total).toFixed(1)} / 5</p>
                    </div>
                </div>
                <p className="mt-4 text-gray-500">Total Ratings: {totalRatings}</p>
            </div>

            {/* Ratings by Spot */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-slate-950">Ratings by Spot</h2>
                {ratingsBySpot.length === 0 ? (
                    <p className="text-gray-500">No ratings available for your spots yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Spot Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Availability Rating
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cleanliness Rating
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Rating
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rating Count
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rating Distribution
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {ratingsBySpot.map((spot) => (
                                <tr key={spot.spotId}>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-950">
                                        <button
                                            onClick={openCard}
                                            className="text-gray-600 hover:text-gray-800 underline decoration-dotted"
                                        >
                                            {spot.spotName.length > 20 ? `${spot.spotName.slice(0, 20)}...` : spot.spotName}
                                        </button>
                                    </td>
                                    {isCardOpen && (
                                        <ParkingSpotCard spotName={spot.spotName} onClose={closeCard} />
                                    )}

                                    <td className="px-6 py-4 whitespace-nowrap text-slate-950">{Number(spot.availabilityRating).toFixed(1)} /
                                        5
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-950">{Number(spot.cleanlinessRating).toFixed(1)} /
                                        5
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-950">{Number(spot.totalRating).toFixed(1)} /
                                        5
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-950">{spot.ratingCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-950">
                                        {spot.ratingDistribution.map((dist) => (
                                            <div key={dist.stars} className="flex items-center text-slate-950">
                                                <span className="mr-2">{dist.stars}<Star/>:</span>
                                                <span>{dist.count} ({dist.percentage}%)</span>
                                            </div>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RatingsTab;
