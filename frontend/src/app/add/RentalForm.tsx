// src/components/forms/RentalForm.tsx

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, X, Upload, MapPin } from 'lucide-react';
import Webcam from 'react-webcam';
import { useToast } from '@/components/ui/use-toast';
import { useDispatch } from 'react-redux';
import { addParkingSpot, resetState } from '@/features/add/addSlice';
import { useRouter } from 'next/navigation';
import { DaysOfWeek } from '@/types/type';
import { Input } from '@/components/ui/input';

const formatTime = (time: string): string => {
    return time; // Keeping time as "HH:mm" since backend expects time-only strings
};

const RentalForm: React.FC = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const { toast } = useToast();

    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const webcamRef = useRef<Webcam>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeSlot, setTimeSlot] = useState<any>({
        day_of_week: [],
        start_time: '',
        end_time: '',
    });
    const [is24Seven, setIs24Seven] = useState<boolean>(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [geoEnabled, setGeoEnabled] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState<string>('');

    /**
     * **Handle Image Selection**
     */
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    /**
     * **Trigger File Input Click**
     */
    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    /**
     * **Remove Selected Image**
     */
    const handleRemoveImage = () => {
        setImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    /**
     * **Capture Image from Camera**
     */
    const handleCameraCapture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setPreviewUrl(imageSrc);
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
     * **Handle 24/7 Toggle**
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
     * **Handle Days of the Week Selection**
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
     * **Get User's Current Location**
     */
    const getUserLocation = () => {
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(loc);
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
     * **Calculate Time Difference in Minutes**
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
     * **Validate Availability Slot**
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
     * **Handle Form Submission**
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
        let latitude: number | undefined;
        let longitude: number | undefined;
        let price: number | null = null;

        let address = '';

        // Since this is the RentalForm, spotType is 'rental'
        name = formData.get('name') as string;
        address = formData.get('address') as string;

        if (!userLocation) {
            toast({
                title: 'Error',
                description: 'Please use your location.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }
        latitude = userLocation.lat;
        longitude = userLocation.lng;

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

        // Build the availability_schedule array based on the single slot
        let availability_schedule: any[] = [];
        if (is24Seven) {
            availability_schedule = Object.values(DaysOfWeek).map((day) => ({
                day_of_week: day,
                start_time: formatTime('00:00'),
                end_time: formatTime('00:00'),
            }));
        } else {
            availability_schedule = timeSlot.day_of_week.map((day: DaysOfWeek) => ({
                day_of_week: day,
                start_time: formatTime(timeSlot.start_time),
                end_time: formatTime(timeSlot.end_time),
            }));
        }

        const data: any = {
            is_paid: true,
            location: {
                latitude,
                longitude,
                address,
            },
            features: [], // Assuming features are handled elsewhere
            photos: [], // Will be handled via 'image' upload
            availability_schedule: availability_schedule,
            pricing_info: {
                base_price: price,
                dynamic_pricing: false, // Modify if dynamic pricing is needed
            },
            name: name,
        };

        const formSubmitData = new FormData();
        formSubmitData.append('data', JSON.stringify(data));

        if (image) {
            formSubmitData.append('image', image);
        } else {
            // If spot type is 'rental' and image is not provided, show an error
            toast({
                title: 'Image Required',
                description: 'Please capture an image of the rental parking spot.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
        }

        try {
            await dispatch(addParkingSpot(formSubmitData)).unwrap();
            toast({
                title: 'Spot Added Successfully!',
                description: 'Your new rental parking spot has been added.',
            });
            dispatch(resetState());
            router.push('/myspots');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error?.message || 'Failed to add parking spot.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Spot Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Spot Name</Label>
                <Input
                    id="name"
                    name="name"
                    required
                    placeholder="e.g. Downtown Parking"
                />
            </div>

            {/* Address */}
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                    id="address"
                    name="address"
                    required
                    placeholder="Full street address"
                />
            </div>

            {/* Location Section */}
            <div className="space-y-2">
                <Label>Location</Label>
                <Button
                    type="button"
                    variant="outline"
                    onClick={getUserLocation}
                    disabled={locationLoading}
                    className="flex items-center space-x-2"
                >
                    <MapPin className="w-4 h-4" />
                    <span>{locationLoading ? 'Locating...' : 'Use My Location'}</span>
                </Button>
                {geoEnabled ? (
                    userLocation ? (
                        <div>
                            <p>Latitude: {userLocation.lat}</p>
                            <p>Longitude: {userLocation.lng}</p>
                        </div>
                    ) : (
                        <p>Your current location will be used for the spot.</p>
                    )
                ) : (
                    <p>Geolocation is not enabled. Please enable location services.</p>
                )}
            </div>

            {/* Availability Schedule */}
            <div className="space-y-4">
                <Label>Availability Schedule</Label>
                <div className="space-y-2 border p-4 rounded-md">
                    {/* Slot Header */}
                    <div className="flex justify-between items-center">
                        <Label>Time Slot</Label>
                    </div>

                    {/* 24/7 Checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`24seven`}
                            checked={is24Seven}
                            onCheckedChange={(checked) => {
                                handle24SevenToggle(checked as boolean);
                            }}
                        />
                        <Label htmlFor={`24seven`}>24/7</Label>
                    </div>

                    {/* Time Inputs (Only if Not 24/7) */}
                    {!is24Seven && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`start_time`}>Start Time</Label>
                                    <Input
                                        id={`start_time`}
                                        type="time"
                                        value={timeSlot.start_time}
                                        onChange={(e) =>
                                            setTimeSlot((prev: any) => ({
                                                ...prev,
                                                start_time: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`end_time`}>End Time</Label>
                                    <Input
                                        id={`end_time`}
                                        type="time"
                                        value={timeSlot.end_time}
                                        onChange={(e) =>
                                            setTimeSlot((prev: any) => ({
                                                ...prev,
                                                end_time: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            {/* Days of the Week */}
                            <div className="space-y-2">
                                <Label>Days of the Week</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.values(DaysOfWeek).map((day) => (
                                        <div key={day} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`${day}`}
                                                checked={timeSlot.day_of_week.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    handleDaySelection(day as DaysOfWeek, checked as boolean);
                                                }}
                                            />
                                            <Label htmlFor={`${day}`}>{day}</Label>
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

            {/* Price Input */}
            <div className="space-y-2">
                <Label htmlFor="price">Price per Hour ($)</Label>
                <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 5.00"
                />
            </div>

            {/* Spot Image Upload Section */}
            <div className="space-y-2">
                <Label>Spot Image</Label>
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
                        className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors`}
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
                {/* File Input */}
                <input
                    type="file"
                    name="image" // Ensure the name matches what's expected on the backend
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                    required
                />
                <div className="flex justify-center mt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCamera(!showCamera)}
                        disabled={false} // Allow toggling camera
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        {showCamera ? 'Hide Camera' : 'Use Camera'}
                    </Button>
                </div>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !image || !userLocation}
            >
                {isSubmitting ? 'Adding Spot...' : 'Add Parking Spot'}
            </Button>
        </form>
    );
};

export default RentalForm;
