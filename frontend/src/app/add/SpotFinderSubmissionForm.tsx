'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Camera, MapPin } from 'lucide-react';
import Webcam from 'react-webcam';
import { useToast } from '@/components/ui/use-toast';
import { useDispatch } from 'react-redux';
import { addParkingSpot, resetState } from '@/features/add/addSlice';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

const formatTimestamp = (date: Date): string => {
    return date.toISOString(); // Format as ISO string
};

const SpotFinderSubmissionForm: React.FC = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const { toast } = useToast();

    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [timestamp, setTimestamp] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [error, setError] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const webcamRef = useRef<Webcam>(null);
    const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
    const locationTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        setTimestamp(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    /**
     * **Capture Image from Camera**
     */
    const handleCameraCapture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        const captureTime = new Date();
        if (imageSrc) {
            setPreviewUrl(imageSrc);
            fetch(imageSrc)
                .then((res) => res.blob())
                .then((blob) => {
                    const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
                    setImage(file);
                    setTimestamp(formatTimestamp(captureTime));

                    // Start location capture timer
                    captureTimerRef.current = setTimeout(() => {
                        if (!location) {
                            setError('Location not captured within 15 seconds of taking the photo.');
                            toast({
                                title: 'Error',
                                description: 'Location was not captured within 15 seconds of taking the photo.',
                                variant: 'destructive',
                            });
                        }
                    }, 15000); // 15 seconds
                });
            setShowCamera(false);
        }
    }, [location, toast]);

    /**
     * **Capture User Location**
     */
    const captureLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setLocation(loc);
                    setTimestamp((prev) => (prev ? prev : formatTimestamp(new Date())));

                    // Clear any existing timers
                    if (captureTimerRef.current) {
                        clearTimeout(captureTimerRef.current);
                        captureTimerRef.current = null;
                    }
                    if (locationTimerRef.current) {
                        clearTimeout(locationTimerRef.current);
                        locationTimerRef.current = null;
                    }
                },
                (err) => {
                    console.error(err);
                    toast({
                        title: 'Location Access Denied',
                        description: 'Please allow location access to proceed.',
                        variant: 'destructive',
                    });
                    setError('Location access denied.');
                }
            );

            // Start location capture timer
            locationTimerRef.current = setTimeout(() => {
                if (!location) {
                    setError('Failed to capture location within 15 seconds of taking the photo.');
                    toast({
                        title: 'Error',
                        description: 'Failed to capture location within 15 seconds of taking the photo.',
                        variant: 'destructive',
                    });
                }
            }, 15000); // 15 seconds
        } else {
            toast({
                title: 'Geolocation Not Supported',
                description: "Your browser doesn't support geolocation.",
                variant: 'destructive',
            });
            setError("Geolocation is not supported by your browser.");
        }
    };

    /**
     * **Handle Form Submission**
     */
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Validate that image and location are present
        if (!image) {
            toast({
                title: 'Image Required',
                description: 'Please upload or capture an image of the parking spot.',
                variant: 'destructive',
            });
            return;
        }

        if (!location) {
            toast({
                title: 'Location Required',
                description: 'Please allow location access to proceed.',
                variant: 'destructive',
            });
            return;
        }

        if (!timestamp) {
            toast({
                title: 'Timestamp Missing',
                description: 'Please ensure the photo and location are captured within 15 seconds of each other.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        setError('');

        // Prepare data for submission
        const data: any = {
            is_paid: false, // Since it's a free spot
            location: {
                latitude: location.lat,
                longitude: location.lng,
            },
            timestamp: timestamp,
            photos: [], // Will be handled via 'image' upload
        };

        const formSubmitData = new FormData();
        formSubmitData.append('data', JSON.stringify(data));
        formSubmitData.append('image', image);

        try {
            await dispatch(addParkingSpot(formSubmitData)).unwrap();
            toast({
                title: 'Spot Added Successfully!',
                description: 'Your free parking spot has been added.',
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

    /**
     * **Cleanup Timers on Unmount**
     */
    useEffect(() => {
        return () => {
            if (captureTimerRef.current) {
                clearTimeout(captureTimerRef.current);
            }
            if (locationTimerRef.current) {
                clearTimeout(locationTimerRef.current);
            }
        };
    }, []);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Capture Section */}
            <div className="space-y-2">
                <Label>Parking Spot Photo</Label>
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

            {/* Location Capture Section */}
            <div className="space-y-2">
                <Label>Location</Label>
                <Button
                    type="button"
                    variant="outline"
                    onClick={captureLocation}
                    disabled={!!location || isSubmitting}
                    className="flex items-center space-x-2"
                >
                    <MapPin className="w-4 h-4" />
                    <span>{location ? 'Location Captured' : 'Capture Location'}</span>
                </Button>
                {location && (
                    <div>
                        <p>Latitude: {location.lat}</p>
                        <p>Longitude: {location.lng}</p>
                        <p>Timestamp: {timestamp}</p>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !image || !location}
            >
                {isSubmitting ? 'Adding Spot...' : 'Add Free Parking Spot'}
            </Button>
        </form>
    );
};

export default SpotFinderSubmissionForm;
