'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogOverlay,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogOverlay,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppDispatch, useAppSelector } from '@/store/hooks'; // Use typed hooks
import { request_delete_account, get_notification_time, update_notification_time } from "@/features/user/userSlice";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/components/ui/use-toast';

interface FormData {
    password: string;
    confirmPassword: string;
}

export default function SettingsPage() {
    const dispatch = useAppDispatch(); // Use the typed dispatch
    const router = useRouter();
    const [accountDeleted, setAccountDeleted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [notificationTime, setNotificationTime] = useState('');
    const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
    const { toast } = useToast();
    const userNotificationTime = useAppSelector((state) => state.user.notificationTime);

    useEffect(() => {
        dispatch(get_notification_time());
    }, [dispatch]);

    // Initialize React Hook Form
    const {
        watch,
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>();

    // Handle delete account
    const handleDeleteAccount = async (data: { password: string, confirmPassword: string }) => {
        try {
            // Dispatch the deleteAccount thunk with the password from the form
            //@ts-ignore
            const resultAction = await dispatch(request_delete_account({ password: data.password })); // Use `data.password`

            if (request_delete_account.fulfilled.match(resultAction)) {
                // Account successfully deleted
                setAccountDeleted(true); // Show account deleted dialog
            } else if (request_delete_account.rejected.match(resultAction)) {
                // Account deletion failed
                setErrorMessage(resultAction.payload as string); // Show error message
            }
        } catch (error) {
            console.error('Account deletion failed:', error);
            setErrorMessage('An unexpected error occurred.');
        }
    };

    // Handle save notification time
    const handleSaveNotificationTime = (event: React.FormEvent) => {
        event.preventDefault();
        dispatch(update_notification_time({ notificationTime }))
            .then((resultAction: any) => {
                if (update_notification_time.fulfilled.match(resultAction)) {
                    toast({
                        title: 'Notification time updated!',
                        description: 'Your new notification time has been saved.',
                    });
                } else if (update_notification_time.rejected.match(resultAction)) {
                    toast({
                        title: 'Failed to update notification time',
                        description: resultAction.payload as string,
                    });
                }
            })
            .catch((err: any) => {
                console.error("Reset failed:", err);

            })
            .finally(() => setIsNotificationDialogOpen(false));
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-4 md:p-8 text-gray-900">
            <Link href="/profile" passHref>
                <Button variant="link" className="absolute top-2 left-0">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Button>
            </Link>

            <div className="w-full max-w-md bg-gray-50 rounded-lg p-6 md:p-8">

                <h2 className="text-2xl font-semibold mb-6">Settings</h2>

                {/* Notification Settings */}
                <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Notification Options</h3>
                    <div className="flex items-center mb-3">
                        <Checkbox id="emailNotifications" className="mr-3 h-4 w-4" />
                        <Label htmlFor="emailNotifications" className="text-sm">
                            Email Notifications
                        </Label>
                    </div>
                    <div className="flex items-center">
                        <Checkbox id="pushNotifications" className="mr-3 h-4 w-4" />
                        <Label htmlFor="pushNotifications" className="text-sm">
                            Push Notifications
                        </Label>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm text-gray-700">Current Notification Time: {userNotificationTime} minutes</p>
                        <Button
                            variant="secondary"
                            className="mt-4 bg-gray-800 hover:bg-gray-700 text-white"
                            onClick={() => setIsNotificationDialogOpen(true)}
                        >
                            Set Custom Notification Time
                        </Button>
                    </div>
                </div>

                {/* Delete Account Section */}
                <div className="mt-12">
                    <h3 className="text-lg font-medium text-red-600 mb-4">Delete Account</h3>
                    <p className="text-sm text-gray-700 mb-6">
                        Deleting your account is permanent and cannot be undone.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full shadow-md">
                                Delete My Account
                            </Button>
                        </AlertDialogTrigger>
                        {/* Semi-transparent overlay */}
                        <AlertDialogOverlay className="bg-black bg-opacity-50 fixed inset-0" />
                        <AlertDialogContent className="bg-white rounded-md p-6">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                                    Confirm Account Deletion
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-base text-gray-700 mt-2">
                                    Please confirm your password to permanently delete your account.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <form onSubmit={handleSubmit(handleDeleteAccount)} className="mt-6">
                                <div className="mb-4">
                                    <Label htmlFor="password" className="text-sm font-medium text-gray-800">
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        {...register('password', { required: 'Password is required' })}
                                        className="mt-1 block w-full text-gray-800"
                                    />
                                    {errors.password && (
                                        <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <Label
                                        htmlFor="confirmPassword"
                                        className="text-sm font-medium text-gray-900" // Updated to text-gray-900
                                    >
                                        Confirm Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm your password"
                                        {...register('confirmPassword', {
                                            required: 'Confirm your password',
                                            validate: (val: string) => {
                                                if (watch('password') != val) {
                                                    return "Your passwords do not match";
                                                }
                                            }
                                        })}
                                        className="mt-1 block w-full text-gray-800"
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-red-600 text-sm mt-1">
                                            {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                                {/* Error message for mismatched passwords */}
                                {errorMessage && (
                                    <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
                                )}
                                <AlertDialogFooter className="mt-6">
                                    <AlertDialogCancel asChild>
                                        <Button variant="secondary">Cancel</Button>
                                    </AlertDialogCancel>
                                    <Button variant="destructive" type="submit">
                                        Yes, Delete My Account
                                    </Button>
                                </AlertDialogFooter>
                            </form>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Account Deleted Dialog */}
            <Dialog
                open={accountDeleted}
                onOpenChange={(open) => {
                    if (!open) {
                        router.push('/login');
                    }
                }}
            >
                {/* Semi-transparent overlay */}
                <DialogOverlay className="bg-black bg-opacity-50 fixed inset-0" />
                <DialogContent className="bg-white rounded-md p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            Email Sent
                        </DialogTitle>
                        <DialogDescription className="text-base text-gray-700 mt-2">
                            A deletion email has been sent to you.
                        </DialogDescription>
                    </DialogHeader>
                    <Button
                        variant="secondary"
                        onClick={() => router.push('/login')}
                        className="w-full mt-6 text-gray-900"
                    >
                        Go to Login
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Custom Notification Time Dialog */}
            <Dialog
                open={isNotificationDialogOpen}
                onOpenChange={setIsNotificationDialogOpen}
            >
                {/* Semi-transparent overlay */}
                <DialogOverlay className="bg-black bg-opacity-50 fixed inset-0" />
                <DialogContent className="bg-white rounded-md p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            Set Custom Notification Time
                        </DialogTitle>
                        <DialogDescription className="text-base text-gray-700 mt-2">
                            Select a custom notification time from the dropdown below.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="mt-6">
                        <div className="mb-4">
                            <Label htmlFor="notificationTime" className="text-sm font-medium text-gray-800">
                                Notification Time
                            </Label>
                            <select
                                id="notificationTime"
                                value={notificationTime}
                                onChange={(e) => setNotificationTime(e.target.value)}
                                className="mt-1 block w-full text-gray-800"
                            >
                                <option value="">Select time</option>
                                <option value="5">5 minutes</option>
                                <option value="10">10 minutes</option>
                                <option value="15">15 minutes</option>
                                <option value="20">20 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="60">1 hour</option>
                            </select>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button variant="secondary" onClick={() => setIsNotificationDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="default" onClick={handleSaveNotificationTime}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}