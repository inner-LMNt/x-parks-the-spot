'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { Settings, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

// Profile stats component
function ProfileStats({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-lg md:text-xl font-bold">{value}</p>
            <p className="text-sm md:text-base text-gray-600">{label}</p>
        </div>
    );
}

// Achievement card component supporting both Tailwind colors and hex codes
function AchievementCard({ colorClass, label }: { colorClass: string; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div
                className={`w-12 h-12 rounded-full mb-2 ${colorClass} drop-shadow-lg`} // Added drop shadow here
                role="img"
                aria-label={label}
            ></div>
            <p className="text-xs text-gray-600">{label}</p>
        </div>
    );
}

// Comment card component
function CommentCard({
                         user,
                         comment,
                         sentiment,
                     }: {
    user: string;
    comment: string;
    sentiment: string;
}) {
    return (
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm flex justify-between items-start drop-shadow-lg"> {/* Added drop shadow here */}
            <div>
                <p className="text-sm font-bold text-gray-900">{user}</p>
                <p className="text-sm text-gray-700">{comment}</p>
            </div>
            <div className="flex items-center">
                {sentiment === 'positive' ? (
                    <ArrowUpCircle className="w-6 h-6 text-green-500" />
                ) : (
                    <ArrowDownCircle className="w-6 h-6 text-red-500" />
                )}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const [eloRating] = useState(1200); // Default Elo rating

    const userProfile = {
        username: 'John Doe',
        joinedDate: new Date(2020, 5, 1), // Year and month the user joined
        spotfindPosts: 50, // Number of Spotfind posts made
        yearsOnApp: 2, // Time on the app
    };

    const maxElo = 3000; // Maximum Elo value for the bar

    const comments = [
        { user: 'User1', comment: 'Logged many good spots!', sentiment: 'positive' },
        { user: 'User2', comment: 'Found a great spot, thanks!', sentiment: 'positive' },
        { user: 'User3', comment: 'Logged a spot that was on private property', sentiment: 'negative' },
        { user: 'User4', comment: 'Helpful and friendly service!', sentiment: 'positive' },
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 md:p-8 text-gray-900">
            <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl text-center white rounded-lg p-6 md:p-8">
                {/* Settings Icon in the corner */}
                <Link href="/settings" passHref>
                    <div className="absolute top-4 right-4" aria-label="Settings">
                        <Settings className="w-6 h-6 text-gray-400 cursor-pointer hover:text-gray-600" />
                    </div>
                </Link>

                {/* Profile Section */}
                <div className="flex flex-col items-center mb-4">
                    <div className="w-24 h-24 rounded-full bg-gray-300 mb-4 drop-shadow-lg" /> {/* Added drop shadow here */}
                    <h1 className="text-2xl md:text-3xl font-bold mb-1">{userProfile.username}</h1>
                    <div className="flex justify-center items-center space-x-8">
                        <ProfileStats label="Rating" value={eloRating} />
                        <ProfileStats label="Posts" value={userProfile.spotfindPosts} />
                        <ProfileStats label="Years" value={userProfile.yearsOnApp} />
                    </div>
                </div>

                {/* Elo Rating Bar */}
                <div className="w-full bg-gray-300 rounded-full h-4 mb-6 drop-shadow-lg"> {/* Added drop shadow here */}
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${(eloRating / maxElo) * 100}%` }}></div>
                </div>

                {/* Achievements Section */}
                <div className="text-left mb-6">
                    <h2 className="text-lg font-semibold mb-4">Achievements</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {/* Passing Tailwind color classes as props */}
                        <AchievementCard colorClass="bg-blue-500" label="Top Spot" />
                        <AchievementCard colorClass="bg-yellow-500" label="Quick Finder" />
                        <AchievementCard colorClass="bg-red-500" label="Top Rating" />
                    </div>
                </div>

                {/* Comments/Review Section with Arrow indicating sentiment */}
                <div className="text-left mb-6">
                    <h2 className="text-lg font-semibold mb-4">Comments</h2>
                    <div className="space-y-2">
                        {comments.map((commentData, index) => (
                            <CommentCard
                                key={index}
                                user={commentData.user}
                                comment={commentData.comment}
                                sentiment={commentData.sentiment}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
