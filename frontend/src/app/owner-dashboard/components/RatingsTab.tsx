'use client';

import React from 'react';

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
    recentReviews: any[]; // Empty array since ratings have no comments
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

const RatingsTab: React.FC<RatingsTabProps> = ({ ratingMetrics }) => {
    if (!ratingMetrics) {
        return <p className="text-gray-500">No rating metrics available.</p>;
    }

    const {averageRatings, totalRatings, ratingsBySpot} = ratingMetrics;

    return (
        <div className="space-y-6">
            {/* Overall Ratings */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Overall Ratings</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-gray-600">Availability</p>
                        <p className="text-2xl font-bold">{averageRatings.availability.toFixed(1)} / 5</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Cleanliness</p>
                        <p className="text-2xl font-bold">{averageRatings.cleanliness.toFixed(1)} / 5</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Overall</p>
                        <p className="text-2xl font-bold">{averageRatings.total.toFixed(1)} / 5</p>
                    </div>
                </div>
                <p className="mt-4 text-gray-500">Total Ratings: {totalRatings}</p>
            </div>

            {/* Ratings by Spot */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Ratings by Spot</h2>
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
                                    <td className="px-6 py-4 whitespace-nowrap">{spot.spotName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{spot.availabilityRating.toFixed(1)} /
                                        5
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{spot.cleanlinessRating.toFixed(1)} /
                                        5
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{spot.totalRating.toFixed(1)} / 5</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{spot.ratingCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {spot.ratingDistribution.map((dist) => (
                                            <div key={dist.stars} className="flex items-center">
                                                <span className="mr-2">{dist.stars}⭐:</span>
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
