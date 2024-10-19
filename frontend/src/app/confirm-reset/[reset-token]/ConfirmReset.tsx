'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { reset_password } from '@/features/user/userSlice';
import { zxcvbn } from '@zxcvbn-ts/core';

export default function ConfirmResetPage() {
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    const dispatch = useAppDispatch();
    const params = useParams();
    const token = params?.['reset-token'] as string ?? "invalid";

    const handleConfirmReset = () => {
        if (!token) {
            setError("Invalid or missing token");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (zxcvbn(newPassword).score < 3) {
            setError("Password is too weak");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError(null);

        dispatch(reset_password({ token, newPassword }))
            .then((resultAction: any) => {
                if (reset_password.fulfilled.match(resultAction)) {
                    console.log("Password reset successfully");
                    setConfirmed(true);
                } else if (reset_password.rejected.match(resultAction)) {
                    console.log("Reset failed", resultAction.payload);
                    setError(resultAction.payload || "Password reset failed");
                }
            })
            .catch((err: any) => {
                console.error("Reset failed:", err);
                setError("Something went wrong");
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            >
                <Card className="w-[350px] shadow-2xl backdrop-blur-sm bg-white/90">
                    <CardHeader className="space-y-1">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 100 }}>
                            <CardTitle className="text-2xl text-center font-bold">Confirm Password Reset</CardTitle>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 100 }}>
                            {!confirmed ? (
                                <CardDescription className="text-center">
                                    Please enter your new password.
                                </CardDescription>
                            ) : (
                                <CardDescription className="text-center text-green-500">
                                    Password reset confirmed. <br />
                                </CardDescription>
                            )}
                            {error && (
                                <CardDescription className="text-center text-red-500">
                                    {error}
                                </CardDescription>
                            )}
                        </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!confirmed ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ stiffness: 100 }}
                            >
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded"
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded mt-2"
                                />
                                <Button
                                    onClick={handleConfirmReset}
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 mt-4"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Confirm Reset
                                </Button>
                            </motion.div>
                        ) : null}
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 100 }}>
                            <Link href="/login">
                                <Button variant="link" className="text-sm text-gray-600 hover:text-gray-800">
                                    Back to Login
                                </Button>
                            </Link>
                        </motion.div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
