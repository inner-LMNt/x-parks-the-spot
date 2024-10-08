'use client';

import React from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { Settings, ArrowUpCircle, ArrowDownCircle, LogOut } from 'lucide-react';
import { logout } from '@/features/user/userSlice';
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    const dispatch = useDispatch();
    const isLoggedIn = useSelector(state => state.user.isLoggedIn);
    const [eloRating] = React.useState(1200);

    const handleLogout = () => {
        dispatch(logout());
    };

    const userProfile = {
        username: 'John Doe',
        joinedDate: new Date(2020, 5, 1),
        spotfindPosts: 50,
        yearsOnApp: 2,
    };

    const maxElo = 3000;

    const comments = [
        { user: 'User1', comment: 'Logged many good spots!', sentiment: 'positive' },
        { user: 'User2', comment: 'Found a great spot, thanks!', sentiment: 'positive' },
        { user: 'User3', comment: 'Logged a spot that was on private property', sentiment: 'negative' },
        { user: 'User4', comment: 'Helpful and friendly service!', sentiment: 'positive' },
    ];

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900">
                <p className="text-xl">Please <Link href="/login" className="text-blue-500 underline">log in</Link> to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 md:p-8 text-gray-900">
            <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl text-center white rounded-lg p-6 md:p-8">
                {/* Logout Button with AlertDialog */}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="absolute top-4 left-4">
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will end your current session.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Settings Icon */}
                <Link href="/settings" passHref>
                    <div className="absolute top-4 right-4" aria-label="Settings">
                        <Settings className="w-6 h-6 text-gray-400 cursor-pointer hover:text-gray-600" />
                    </div>
                </Link>

                {/* Profile Section */}
                <div className="flex flex-col items-center mb-4">
                    <div className="w-24 h-24 rounded-full bg-gray-300 mb-4 drop-shadow-lg" />
                    <h1 className="text-2xl md:text-3xl font-bold mb-1">{userProfile.username}</h1>
                    <div className="flex justify-center items-center space-x-8">
                        <ProfileStats label="Rating" value={eloRating} />
                        <ProfileStats label="Posts" value={userProfile.spotfindPosts} />
                        <ProfileStats label="Years" value={userProfile.yearsOnApp} />
                    </div>
                </div>

                {/* Elo Rating Bar */}
                <div className="w-full bg-gray-300 rounded-full h-4 mb-6 drop-shadow-lg">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${(eloRating / maxElo) * 100}%` }}></div>
                </div>

                {/* Achievements Section */}
                <div className="text-left mb-6">
                    <h2 className="text-lg font-semibold mb-4">Achievements</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <AchievementCard colorClass="bg-blue-500" label="Top Spot" />
                        <AchievementCard colorClass="bg-yellow-500" label="Quick Finder" />
                        <AchievementCard colorClass="bg-red-500" label="Top Rating" />
                    </div>
                </div>

                {/* Comments/Review Section */}
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