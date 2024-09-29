'use client';

import React, { useState } from 'react';
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
    DialogDescription,
    DialogOverlay,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {RegisterRequest} from "@/types/type";
import {useAppDispatch, useAppSelector} from '@/store/hooks'; // Use typed hooks
import {deleteAccount} from "@/features/user/userSlice";

interface FormData {
    password: string;
    confirmPassword: string;
}

export default function SettingsPage() {
    const dispatch = useAppDispatch(); // Use the typed dispatch
    const router = useRouter();
    const [accountDeleted, setAccountDeleted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const userID = useAppSelector((state) => state.user.userId);
    console.log("brodaj")
    console.log(userID)
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
            const resultAction = await dispatch(deleteAccount({userId: userID, password: data.password})); // Use `data.password`

            if (deleteAccount.fulfilled.match(resultAction)) {
                // Account successfully deleted
                setAccountDeleted(true); // Show account deleted dialog
            } else if (deleteAccount.rejected.match(resultAction)) {
                // Account deletion failed
                setErrorMessage(resultAction.payload as string); // Show error message
            }
        } catch (error) {
            console.error('Account deletion failed:', error);
            setErrorMessage('An unexpected error occurred.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-4 md:p-8 text-gray-900">
            <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 md:p-8">
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
                </div>

                {/* Delete Account Section */}
                <div className="mt-12">
                    <h3 className="text-lg font-medium text-red-600 mb-4">Delete Account</h3>
                    <p className="text-sm text-gray-700 mb-6">
                        Deleting your account is permanent and cannot be undone.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
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
                            Account Deleted
                        </DialogTitle>
                        <DialogDescription className="text-base text-gray-700 mt-2">
                            Your account has been successfully deleted.
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
        </div>
    );
}
