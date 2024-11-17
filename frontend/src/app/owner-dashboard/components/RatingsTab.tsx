'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ParkingSpace } from '@/types/type';
import { Star, Sparkles, ThumbsUp } from 'lucide-react';

interface RatingMetrics {
    averageRatings: {
        availability: number;
        cleanliness: number;
        total: number;
    };
    totalRatings: number;
    ratingsBySpot: Array<{
        spotId: string;
        spotName: string;
        availabilityRating: number;
        cleanlinessRating: number;
        totalRating: number | 'unrated';
        ratingCount: number;
        ratingDistribution: Array<{
            stars: number;
            count: number;
            percentage: number;
        }>;
        recentReviews: Array<{
            rating: number;
            daysAgo: number;
            comment: string;
            isVerified: boolean;
        }>;
        responseMetrics: {
            averageResponseTime: number;
            issueResolutionRate: number;
            ratingTrend: number;
        };
    }>;
    performanceMetrics: {
        responseRate: number;
        ratingImprovement: number;
        customerReturnRate: number;
    };
}

interface RatingsTabProps {
    spots: ParkingSpace[];
    ratingMetrics: RatingMetrics;
}

export default function RatingsTab({
                                       spots,
                                       ratingMetrics
                                   }: RatingsTabProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ratingMetrics.averageRatings.total.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">
                            From {ratingMetrics.totalRatings} reviews
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Availability Rating</CardTitle>
                        <Sparkles className="w-4 h-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {ratingMetrics.averageRatings.availability.toFixed(1)}
                        </div>
                        <Progress
                            value={ratingMetrics.averageRatings.availability * 20}
                            className="mt-2"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Cleanliness Rating</CardTitle>
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {ratingMetrics.averageRatings.cleanliness.toFixed(1)}
                        </div>
                        <Progress
                            value={ratingMetrics.averageRatings.cleanliness * 20}
                            className="mt-2"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6">
                {ratingMetrics.ratingsBySpot.map((spotRating) => (
                    <Card key={spotRating.spotId}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{spotRating.spotName}</CardTitle>
                                    <CardDescription>
                                        {spots.find(s => s.id === spotRating.spotId)?.location.address}
                                    </CardDescription>
                                </div>
                                <Badge className="flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-current" />
                                    {spotRating.totalRating === 'unrated' ? 'Not rated' :
                                        spotRating.totalRating.toFixed(1)}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Availability</span>
                                        <span>{spotRating.availabilityRating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                    <Progress
                                        value={spotRating.availabilityRating * 20}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Cleanliness</span>
                                        <span>{spotRating.cleanlinessRating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                    <Progress
                                        value={spotRating.cleanlinessRating * 20}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Reviews</p>
                                        <p className="text-lg font-bold">{spotRating.ratingCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Return Rate</p>
                                        <p className="text-lg font-bold">
                                            {`${ratingMetrics.performanceMetrics.customerReturnRate}%`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Response Rate</p>
                                        <p className="text-lg font-bold">
                                            {`${ratingMetrics.performanceMetrics.responseRate}%`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 border-t pt-6">
                                <h4 className="text-sm font-semibold mb-4">Rating Distribution</h4>
                                <div className="space-y-2">
                                    {spotRating.ratingDistribution.map((dist) => (
                                        <div key={dist.stars} className="flex items-center gap-2">
                                            <div className="flex items-center w-12">
                                                <span className="text-sm">{dist.stars}</span>
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 ml-1" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                                    <div
                                                        className="h-full bg-yellow-400 rounded-full"
                                                        style={{ width: `${dist.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-12 text-sm text-gray-500">
                                                {dist.count}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 border-t pt-6">
                                <h4 className="text-sm font-semibold mb-4">Recent Reviews</h4>
                                <div className="space-y-4">
                                    {spotRating.recentReviews.map((review, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${
                                                                    i < review.rating
                                                                        ? 'text-yellow-400 fill-yellow-400'
                                                                        : 'text-gray-300'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {review.daysAgo} days ago
                                                    </p>
                                                </div>
                                                {review.isVerified && (
                                                    <Badge variant="outline">Verified Stay</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 border-t pt-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Avg Response Time</p>
                                        <p className="text-lg font-bold">
                                            {spotRating.responseMetrics.averageResponseTime} min
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Issue Resolution</p>
                                        <p className="text-lg font-bold">
                                            {spotRating.responseMetrics.issueResolutionRate}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Rating Trend</p>
                                        <div className="flex items-center">
                                            <p className={`text-lg font-bold ${
                                                spotRating.responseMetrics.ratingTrend > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {spotRating.responseMetrics.ratingTrend > 0 ? '+' : ''}
                                                {spotRating.responseMetrics.ratingTrend.toFixed(1)}
                                            </p>
                                            <span className="text-sm text-gray-500 ml-1">/ month</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rating Overview</CardTitle>
                    <CardDescription>Performance trends across all spots</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Total Reviews</h4>
                            <div className="text-3xl font-bold">{ratingMetrics.totalRatings}</div>
                            <p className="text-sm text-gray-500 mt-1">
                                Across {ratingMetrics.ratingsBySpot.length} spots
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-2">Response Rate</h4>
                            <div className="text-3xl font-bold">
                                {ratingMetrics.performanceMetrics.responseRate}%
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Within 24 hours
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-2">Rating Improvement</h4>
                            <div className="text-3xl font-bold text-green-600">
                                {ratingMetrics.performanceMetrics.ratingImprovement > 0 ? '+' : ''}
                                {ratingMetrics.performanceMetrics.ratingImprovement}%
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                vs. last month
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-2">Customer Return Rate</h4>
                            <div className="text-3xl font-bold">
                                {ratingMetrics.performanceMetrics.customerReturnRate}%
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Repeat customers
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Improvement Opportunities</CardTitle>
                    <CardDescription>Suggestions based on customer feedback</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            {
                                title: "Improve spot accessibility",
                                description: "Consider adding more detailed directions in the spot description.",
                                impact: "high"
                            },
                            {
                                title: "Update availability faster",
                                description: "Quick updates can increase your booking rate by 15%.",
                                impact: "medium"
                            },
                            {
                                title: "Add more spot photos",
                                description: "Spots with 5+ photos get 35% more bookings.",
                                impact: "high"
                            }
                        ].map((tip, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                            >
                                <span className="p-2 bg-white rounded-full">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                </span>
                                <div>
                                    <h3 className="font-medium flex items-center gap-2">
                                        {tip.title}
                                        <Badge variant={tip.impact === 'high' ? 'default' : 'secondary'}>
                                            {tip.impact} impact
                                        </Badge>
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {tip.description}
                                    </p>
                                </div>
                            </div>
                            ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}