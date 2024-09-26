'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Assuming Next.js for routing, replace with your routing logic

export default function SettingsPage() {
    const router = useRouter(); // To handle navigation (log out)

    // State for the form fields
    const [name, setName] = useState('John Doe');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);

    // State for the delete account modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [accountDeleted, setAccountDeleted] = useState(false); // To show "Account Deleted" message
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Handle delete account
    const handleDeleteAccount = () => {
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match!');
            return;
        }
        // Simulate account deletion (replace with actual logic)
        setAccountDeleted(true);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-4 md:p-8 text-gray-900">
            <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 md:p-8">
                <h2 className="text-2xl font-semibold mb-6">Settings</h2>

                {/* Name Change Section */}
                <div className="mb-6">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        id="name"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Notification Settings */}
                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Notification Options</h3>
                    <div className="flex items-center mb-4">
                        <input
                            type="checkbox"
                            id="emailNotifications"
                            className="mr-2"
                            checked={emailNotifications}
                            onChange={() => setEmailNotifications(!emailNotifications)}
                        />
                        <label htmlFor="emailNotifications" className="text-sm">Email Notifications</label>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="pushNotifications"
                            className="mr-2"
                            checked={pushNotifications}
                            onChange={() => setPushNotifications(!pushNotifications)}
                        />
                        <label htmlFor="pushNotifications" className="text-sm">Push Notifications</label>
                    </div>
                </div>

                {/* Delete Account Section */}
                <div className="mt-10">
                    <h3 className="text-lg font-medium text-red-600 mb-4">Delete Account</h3>
                    <p className="text-sm text-gray-700 mb-4">
                        Deleting your account is permanent and cannot be undone.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Delete My Account
                    </button>
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && !accountDeleted && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-medium text-red-600 mb-4">Confirm Account Deletion</h3>
                        <p className="text-sm text-gray-700 mb-4">
                            Please confirm your password to permanently delete your account.
                        </p>
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {/* Error message for mismatched passwords */}
                        {errorMessage && <p className="text-red-600 text-sm mb-4">{errorMessage}</p>}

                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                            >
                                Yes, Delete My Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Deleted Modal */}
            {accountDeleted && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-medium text-red-600 mb-4">Account Deleted</h3>
                        <p className="text-sm text-gray-700 mb-4">Your account has been successfully deleted.</p>
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
