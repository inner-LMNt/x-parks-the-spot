// src/components/custom/EditSpotModal.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, X, Upload, Plus, ArrowLeft } from 'lucide-react'; // Import ArrowLeft
import Webcam from 'react-webcam';
import { useDispatch, useSelector } from 'react-redux';
import { updateParkingSpot, resetError } from '@/features/owner/ownerSlice';
import { useToast } from '@/components/ui/use-toast';
import { RootState, AppDispatch } from '@/store';
import { ParkingSpace, DaysOfWeek, TimeSlot } from '@/types/type';
import ImageWrapper from "@/components/custom/ImageWrapper";

interface EditSpotModalProps {
    isOpen: boolean;
    onClose: () => void;
    spot: ParkingSpace;
}

const EditSpotModal: React.FC<EditSpotModalProps> = ({ isOpen, onClose, spot }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { toast } = useToast();
    const { loading, error } = useSelector((state: RootState) => state.owner);

    // Initialize state based on the spot's current data
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageRemoved, setImageRemoved] = useState<boolean>(false); // New state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const webcamRef = useRef<Webcam>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // TimeSlot and is24Seven
    const [timeSlot, setTimeSlot] = useState<TimeSlot>({
        day_of_week: spot.availability_schedule?.map(s => s.day_of_week) || [],
        start_time: spot.availability_schedule?.[0]?.start_time || '',
        end_time: spot.availability_schedule?.[0]?.end_time || '',
    });

    const [is24Seven, setIs24Seven] = useState<boolean>(
        spot.availability_schedule?.every(s => s.start_time === '00:00' && s.end_time === '00:00') || false
    );

    const [requireReverification, setRequireReverification] = useState<boolean>(false);

    // Location
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(spot.location || null);
    const [geoEnabled, setGeoEnabled] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState<string>('');

    // Latitude and Longitude state
    const [latitude, setLatitude] = useState<string>(spot.location?.latitude.toString() || '');
    const [longitude, setLongitude] = useState<string>(spot.location?.longitude.toString() || '');

    /**
     * Handle Image Selection
     */
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImage(file);
            setImageRemoved(false); // Reset imageRemoved since a new image is uploaded
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    /**
     * Trigger File Input Click
     */
    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    /**
     * Remove Selected Image
     */
    const handleRemoveImage = () => {
        setImage(null);
        setPreviewUrl(null);
        setImageRemoved(true); // Set imageRemoved to true to show "Previous Image"
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    /**
     * Capture Image from Camera
     */
    const handleCameraCapture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setPreviewUrl(imageSrc);
            setImageRemoved(false); // Reset imageRemoved since a new image is captured
            fetch(imageSrc)
                .then((res) => res.blob())
                .then((blob) => {
                    const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
                    setImage(file);
                });
            setShowCamera(false);
        }
    }, []);

    /**
     * Handle 24/7 Toggle
     */
    const handle24SevenToggle = (checked: boolean) => {
        setIs24Seven(checked);
        if (checked) {
            setTimeSlot({
                day_of_week: [],
                start_time: '00:00',
                end_time: '00:00',
            });
        } else {
            setTimeSlot({
                day_of_week: [],
                start_time: '',
                end_time: '',
            });
        }
    };

    /**
     * Handle Days of the Week Selection
     */
    const handleDaySelection = (day: DaysOfWeek, checked: boolean) => {
        if (checked) {
            setTimeSlot((prev: any) => ({
                ...prev,
                day_of_week: [...prev.day_of_week, day],
            }));
        } else {
            setTimeSlot((prev: any) => ({
                ...prev,
                day_of_week: prev.day_of_week.filter((d: DaysOfWeek) => d !== day),
            }));
        }
    };

    /**
     * Get User's Current Location
     */
    const getUserLocation = () => {
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(location);
                    setLatitude(position.coords.latitude.toString());
                    setLongitude(position.coords.longitude.toString());
                    setGeoEnabled(true);
                    setLocationLoading(false);
                },
                () => {
                    console.error("Error: The Geolocation service failed.");
                    setGeoEnabled(false);
                    setLocationLoading(false);
                }
            );
        } else {
            console.error("Error: Your browser doesn't support geolocation.");
            setGeoEnabled(false);
            setLocationLoading(false);
        }
    };

    /**
     * Calculate Time Difference in Minutes
     * Returns the difference between end and start times in minutes.
     */
    const calculateTimeDifference = (start: string, end: string): number => {
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;

        let diff = endTotalMinutes - startTotalMinutes;
        if (diff < 0) {
            diff += 24 * 60; // Wrap around to next day
        }
        return diff;
    };

    /**
     * Validate Availability Slot
     */
    const validateAvailability = () => {
        let isValid = true;
        let errorMsg = '';

        if (is24Seven) {
            // For 24/7, ensure start_time and end_time are '00:00'
            if (timeSlot.start_time !== '00:00' || timeSlot.end_time !== '00:00') {
                isValid = false;
                errorMsg = '24/7 slots must have start and end times set to 00:00.';
            }
        } else {
            // Check if at least one day is selected
            if (timeSlot.day_of_week.length === 0) {
                isValid = false;
                errorMsg = 'Please select at least one day of the week.';
            }

            // Validate time durations
            if (timeSlot.start_time && timeSlot.end_time) {
                const diffMinutes = calculateTimeDifference(timeSlot.start_time, timeSlot.end_time);

                if (diffMinutes !== 0 && diffMinutes < 60) {
                    isValid = false;
                    errorMsg = 'Each time slot must allow for at least one hour of parking.';
                }
            } else {
                isValid = false;
                errorMsg = 'Please provide both start and end times.';
            }
        }

        if (isValid) {
            setAvailabilityError('');
        } else {
            setAvailabilityError(errorMsg);
        }

        return isValid;
    };

    /**
     * Handle Form Submission
     */
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);

        // Validate availability before proceeding
        if (!validateAvailability()) {
            toast({
                title: 'Validation Error',
                description: availabilityError || 'Please fix the errors in your availability schedule.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData(event.currentTarget);
        let name = '';
        let address = '';
        let price: number | null = null;

        if (spot.is_paid) { // Spot type is fixed based on is_paid
            name = formData.get('name') as string;
            address = formData.get('address') as string;

            const priceValue = formData.get('price');
            if (priceValue) {
                price = parseFloat(priceValue as string);
                if (isNaN(price) || price < 0) {
                    toast({
                        title: 'Invalid Price',
                        description: 'Please enter a valid price.',
                        variant: 'destructive',
                    });
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        // Parse latitude and longitude
        const parsedLatitude = parseFloat(latitude);
        const parsedLongitude = parseFloat(longitude);

        if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
            toast({
                title: 'Invalid Coordinates',
                description: 'Please enter valid latitude and longitude values.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        // Build the availability_schedule array based on the single slot
        let availability_schedule: any[] = [];
        if (spot.is_paid) {
            if (is24Seven) {
                availability_schedule = Object.values(DaysOfWeek).map((day) => ({
                    day_of_week: day,
                    start_time: '00:00',
                    end_time: '00:00',
                }));
            } else {
                availability_schedule = timeSlot.day_of_week.map((day: DaysOfWeek) => ({
                    day_of_week: day,
                    start_time: timeSlot.start_time,
                    end_time: timeSlot.end_time,
                }));
            }
        }

        const updatedData: Partial<ParkingSpace> & { requireReverification?: boolean } = {
            location: {
                latitude: parsedLatitude,
                longitude: parsedLongitude,
                address,
            },
            // Assuming features are handled elsewhere
            // features: [],
            // If you handle features, include them here
        };

        if (spot.is_paid) {
            updatedData.name = name;
            updatedData.availability_schedule = availability_schedule;
            updatedData.pricing_info = {
                base_price: price!,
                dynamic_pricing: spot.pricing_info?.dynamic_pricing || false, // Modify if dynamic pricing is needed
            };
        }

        // Include image if a new one is uploaded or captured
        if (image && previewUrl) {
            // Assuming your backend expects images as URLs or handles uploads differently
            // You might need to adjust this based on your backend implementation
            // For now, we'll overwrite the existing image
            updatedData.photos = [previewUrl];
        } else if (imageRemoved) {
            // If the image is removed, set photos to empty array or handle as per backend requirements
            updatedData.photos = [];
        }

        // Determine if changes require reverification
        const changesRequireReverification = determineReverificationRequirements(spot, updatedData);
        if (changesRequireReverification) {
            const confirmReverification = window.confirm(
                "Modifications to this spot require reverification. Do you want to proceed?"
            );
            if (confirmReverification) {
                updatedData.requireReverification = true;
            } else {
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const formSubmitData = new FormData();
            formSubmitData.append('data', JSON.stringify(updatedData));

            if (image && previewUrl) {
                formSubmitData.append('image', image);
            }

            await dispatch(updateParkingSpot({ id: spot.id, data: formSubmitData })).unwrap();
            toast({
                title: 'Spot Updated Successfully!',
                description: 'Your parking spot has been updated.',
            });
            dispatch(resetError());
            onClose();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error?.message || 'Failed to update parking spot.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Determine if changes require reverification
     * This function compares the original spot with the updated data
     * and determines if reverification is needed based on specific fields.
     * Adjust the logic based on your business rules.
     */
    const determineReverificationRequirements = (original: ParkingSpace, updated: Partial<ParkingSpace>): boolean => {
        // Example: Changing location or pricing requires reverification
        if (
            updated.location?.latitude !== original.location.latitude ||
            updated.location?.longitude !== original.location.longitude ||
            (updated.pricing_info?.base_price !== original.pricing_info?.base_price)
        ) {
            return true;
        }
        return false;
    };

    /**
     * Reset form when modal closes
     */
    useEffect(() => {
        if (!isOpen) {
            setImage(null);
            setPreviewUrl(null);
            setImageRemoved(false); // Reset imageRemoved state
            setTimeSlot({
                day_of_week: spot.availability_schedule?.map(s => s.day_of_week) || [],
                start_time: spot.availability_schedule?.[0]?.start_time || '',
                end_time: spot.availability_schedule?.[0]?.end_time || '',
            });
            setIs24Seven(
                spot.availability_schedule?.every(s => s.start_time === '00:00' && s.end_time === '00:00') || false
            );
            setRequireReverification(false);
            setUserLocation(spot.location || null);
            setLatitude(spot.location?.latitude.toString() || '');
            setLongitude(spot.location?.longitude.toString() || '');
            setGeoEnabled(true);
            setLocationLoading(false);
            setAvailabilityError('');
            dispatch(resetError());
        }
    }, [isOpen, spot, dispatch]);

    // Store the original image URL
    const previousImageUrl = spot.photos?.[0] || null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                {/* Overlay */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                {/* Modal Content */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center relative">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
                                {/* Close Arrow */}
                                <button
                                    type="button"
                                    className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
                                    onClick={onClose}
                                    aria-label="Close Edit Parking Spot Modal"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </button>

                                {/* Title with Adjusted Margin to Accommodate Close Arrow */}
                                <div className="mt-8 mb-4">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-2xl font-bold leading-6 text-slate-950"
                                    >
                                        Edit Parking Spot
                                    </Dialog.Title>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Spot Type Display */}
                                    <div className="space-y-2">
                                        <Label className="text-slate-950">Spot Type</Label>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`spot-type-${spot.is_paid ? 'rental' : 'free'}`}
                                                checked={spot.is_paid}
                                                disabled
                                            />
                                            <Label htmlFor={`spot-type-${spot.is_paid ? 'rental' : 'free'}`}>
                                                {spot.is_paid ? 'For Rent' : 'Free'}
                                            </Label>
                                        </div>
                                    </div>

                                    {/* Spot Name (Only for Rental) */}
                                    {spot.is_paid && (
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-slate-950">Spot Name</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                required
                                                defaultValue={spot.name}
                                                placeholder="e.g. Downtown Parking"
                                                className="text-slate-950"
                                            />
                                        </div>
                                    )}

                                    {/* Address (Only for Rental) */}
                                    {spot.is_paid && (
                                        <div className="space-y-2">
                                            <Label htmlFor="address" className="text-slate-950">Address</Label>
                                            <Input
                                                id="address"
                                                name="address"
                                                required
                                                defaultValue={spot.location.address}
                                                placeholder="Full street address"
                                                className="text-slate-950"
                                            />
                                        </div>
                                    )}

                                    {/* Latitude and Longitude Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="latitude" className="text-slate-950">Latitude</Label>
                                            <Input
                                                id="latitude"
                                                name="latitude"
                                                type="number"
                                                step="any"
                                                required
                                                value={latitude}
                                                onChange={(e) => setLatitude(e.target.value)}
                                                className="text-slate-950"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="longitude" className="text-slate-950">Longitude</Label>
                                            <Input
                                                id="longitude"
                                                name="longitude"
                                                type="number"
                                                step="any"
                                                required
                                                value={longitude}
                                                onChange={(e) => setLongitude(e.target.value)}
                                                className="text-slate-950"
                                            />
                                        </div>
                                    </div>

                                    {/* Location Section */}
                                    <div className="space-y-2">
                                        <Label className="text-slate-950">Location</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={getUserLocation}
                                            disabled={locationLoading}
                                            className="flex items-center space-x-2 text-slate-950"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>{locationLoading ? 'Locating...' : 'Use My Location'}</span>
                                        </Button>
                                        {geoEnabled ? (
                                            userLocation ? (
                                                <div>
                                                    <p className="text-slate-950">Latitude: {userLocation.lat}</p>
                                                    <p className="text-slate-950">Longitude: {userLocation.lng}</p>
                                                </div>
                                            ) : (
                                                <p className="text-slate-950">Your current location will be used for the spot.</p>
                                            )
                                        ) : (
                                            <p className="text-slate-950">Geolocation is not enabled. Please enable location services.</p>
                                        )}
                                    </div>

                                    {/* Availability Schedule (Only for Rental) */}
                                    {spot.is_paid && (
                                        <>
                                            <div className="space-y-4">
                                                <Label className="text-slate-950">Availability Schedule</Label>
                                                <div className="space-y-2 border p-4 rounded-md">
                                                    {/* Slot Header */}
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-slate-950">Time Slot</Label>
                                                    </div>

                                                    {/* 24/7 Checkbox */}
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`24seven-edit`}
                                                            checked={is24Seven}
                                                            onCheckedChange={(checked) => {
                                                                handle24SevenToggle(checked as boolean);
                                                            }}
                                                        />
                                                        <Label htmlFor={`24seven-edit`} className="text-slate-950">24/7</Label>
                                                    </div>

                                                    {/* Time Inputs (Only if Not 24/7) */}
                                                    {!is24Seven && (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor={`start_time-edit`} className="text-slate-950">Start Time</Label>
                                                                    <Input
                                                                        id={`start_time-edit`}
                                                                        type="time"
                                                                        value={timeSlot.start_time}
                                                                        onChange={(e) =>
                                                                            setTimeSlot((prev: any) => ({
                                                                                ...prev,
                                                                                start_time: e.target.value,
                                                                            }))
                                                                        }
                                                                        required
                                                                        className="text-slate-950"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor={`end_time-edit`} className="text-slate-950">End Time</Label>
                                                                    <Input
                                                                        id={`end_time-edit`}
                                                                        type="time"
                                                                        value={timeSlot.end_time}
                                                                        onChange={(e) =>
                                                                            setTimeSlot((prev: any) => ({
                                                                                ...prev,
                                                                                end_time: e.target.value,
                                                                            }))
                                                                        }
                                                                        required
                                                                        className="text-slate-950"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Days of the Week */}
                                                            <div className="space-y-2">
                                                                <Label className="text-slate-950">Days of the Week</Label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {Object.values(DaysOfWeek).map((day) => (
                                                                        <div key={day} className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={`${day}-edit`}
                                                                                checked={timeSlot.day_of_week.includes(day)}
                                                                                onCheckedChange={(checked) => {
                                                                                    handleDaySelection(day as DaysOfWeek, checked as boolean);
                                                                                }}
                                                                            />
                                                                            <Label htmlFor={`${day}-edit`} className="text-slate-950">{day}</Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Display error message if any */}
                                                    {availabilityError && (
                                                        <p className="text-red-500 text-sm">{availabilityError}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Price Input (Only for Rental) */}
                                            <div className="space-y-2">
                                                <Label htmlFor="price-edit" className="text-slate-950">Price per Hour ($)</Label>
                                                <Input
                                                    id="price-edit"
                                                    name="price"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                    defaultValue={spot.pricing_info?.base_price}
                                                    placeholder="e.g. 5.00"
                                                    className="text-slate-950"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Previous Image Section */}
                                    {!imageRemoved && previousImageUrl && (
                                        <div className="space-y-2">
                                            <Label className="text-slate-950">Previous Image</Label>
                                            <div className="relative w-full h-40">
                                                <ImageWrapper
                                                    src={previousImageUrl}
                                                    alt={spot.name || 'Parking Spot Image'}
                                                    layout="fill"
                                                    objectFit="cover"
                                                    className="w-full h-40 object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Spot Image Upload Section */}
                                    <div className="space-y-2">
                                        <Label className="text-slate-950">Spot Image</Label>
                                        {showCamera ? (
                                            <div className="relative">
                                                <Webcam
                                                    audio={false}
                                                    ref={webcamRef}
                                                    screenshotFormat="image/jpeg"
                                                    className="w-full rounded-lg"
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={handleCameraCapture}
                                                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    Capture Photo
                                                </Button>
                                            </div>
                                        ) : (
                                            <div
                                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                                                onClick={handleImageClick}
                                            >
                                                {previewUrl ? (
                                                    <div className="relative">
                                                        <img
                                                            src={previewUrl}
                                                            alt="Preview"
                                                            className="max-w-full h-auto mx-auto rounded-lg"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveImage();
                                                            }}
                                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                            aria-label="Remove Image"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center py-8">
                                                        <Upload size={48} className="text-gray-400 mb-2" />
                                                        <p className="text-sm text-gray-500">
                                                            Click to upload an image or use camera
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            ref={fileInputRef}
                                            className="hidden"
                                        />
                                        <div className="flex justify-center mt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setShowCamera(!showCamera)}
                                                className="flex items-center space-x-2 text-slate-950"
                                            >
                                                {showCamera ? (
                                                    <>
                                                        <X className="w-4 h-4 mr-2" />
                                                        Hide Camera
                                                    </>
                                                ) : (
                                                    <>
                                                        <Camera className="w-4 h-4 mr-2" />
                                                        Use Camera
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Reverification Warning */}
                                    {requireReverification && (
                                        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                                            <p>
                                                Changes to your parking spot require reverification. Your spot will no longer be available for new bookings until it's reverified.
                                            </p>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isSubmitting || loading}
                                    >
                                        {isSubmitting || loading ? 'Updating Spot...' : 'Update Parking Spot'}
                                    </Button>

                                    {/* Display Error Message if Any */}
                                    {error && (
                                        <p className="text-red-500 text-center mt-2">{error}</p>
                                    )}
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default EditSpotModal;
