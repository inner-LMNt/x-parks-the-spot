// src/components/custom/EditSpotModal.tsx

'use client';

import React, { useState, useEffect, Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateParkingSpot, resetError } from '@/features/owner/ownerSlice';
import { useToast } from '@/hooks/use-toast';
import { RootState, AppDispatch } from '@/store';
import { ParkingSpace, DaysOfWeek, TimeSlot } from '@/types/type';
import {
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogFooter,
} from '@/components/ui/alert-dialog'; // Import necessary sub-components

interface EditSpotModalProps {
    isOpen: boolean;
    onClose: () => void;
    spot: ParkingSpace;
}

const EditSpotModal: React.FC<EditSpotModalProps> = ({ isOpen, onClose, spot }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { toast } = useToast();
    const { loading, error } = useSelector((state: RootState) => state.owner);

    // Controlled Inputs
    //@ts-ignore
    const [name, setName] = useState<string>(spot.is_paid ? spot.name : '');
    //@ts-ignore
    const [address, setAddress] = useState<string>(spot.is_paid ? spot.location.address : '');
    const [price, setPrice] = useState<number | null>(spot.is_paid ? spot.pricing_info?.base_price || null : null);

    const [timeSlot, setTimeSlot] = useState<any>({
        day_of_week: spot.availability_schedule?.map(s => s.day_of_week) || [],
        start_time: spot.availability_schedule?.[0]?.start_time || '',
        end_time: spot.availability_schedule?.[0]?.end_time || '',
    });

    const [is24Seven, setIs24Seven] = useState<boolean>(false);

    // Location
    //@ts-ignore
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(spot.location || null);
    const [geoEnabled, setGeoEnabled] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Latitude and Longitude state
    const [latitude, setLatitude] = useState<string>(spot.location?.latitude.toString() || '');
    const [longitude, setLongitude] = useState<string>(spot.location?.longitude.toString() || '');

    // Reverification Confirmation Dialog State
    const [isReverifyOpen, setIsReverifyOpen] = useState<boolean>(false);
    const [pendingSubmit, setPendingSubmit] = useState<any>(null); // To store updatedData temporarily

    // Change Detection State
    const [isChanged, setIsChanged] = useState<boolean>(false);

    // Store initial data in a ref to persist across renders
    const initialData = useRef<{
        name: any;
        address: string;
        price: number | null;
        latitude: any;
        longitude: any;
        is24Seven: boolean;
        timeSlot: any;
    }>({
        name: (spot.is_paid ? spot.name : '') ?? '',
        address: (spot.is_paid ? spot.location.address : '') ?? '',
        price: spot.is_paid ? spot.pricing_info?.base_price || null : null,
        latitude: spot.location?.latitude.toString() || '',
        longitude: spot.location?.longitude.toString() || '',
        is24Seven: false,
        timeSlot: {  //@ts-ignore
            day_of_week: spot.availability_schedule?.map(s => s.day_of_week) || [],
            start_time: spot.availability_schedule?.[0]?.start_time || '',
            end_time: spot.availability_schedule?.[0]?.end_time || '',
        }
    });

    /**
     * Update initialData and is24Seven when modal opens with a new spot
     */
    useEffect(() => {
        if (isOpen) {
            // Compute if the spot is 24/7
            const hasAllTimesZero = spot.availability_schedule?.every(
                s => s.start_time === '00:00' && s.end_time === '23:59'
            );
            //@ts-ignore
            const hasSevenDays = spot?.availability_schedule?.length >= 7 ?? false;
            const computedIs24Seven = !!(hasAllTimesZero && hasSevenDays);

            console.log('Availability Schedule:', spot.availability_schedule);
            console.log('All times zero:', hasAllTimesZero);
            console.log('Has seven days:', hasSevenDays);

            setIs24Seven(computedIs24Seven);

            // Set initial data with the correct is24Seven value
            initialData.current = {
                name: (spot.is_paid ? spot.name : '') ?? '',
                address: (spot.is_paid ? spot.location.address : '') ?? '',
                price: spot.is_paid ? spot.pricing_info?.base_price || null : null,
                latitude: spot.location?.latitude.toString() || '',
                longitude: spot.location?.longitude.toString() || '',
                is24Seven: computedIs24Seven, // Correctly set to computed value
                timeSlot: {
                    day_of_week: spot.availability_schedule?.map(s => s.day_of_week) || [],
                    start_time: spot.availability_schedule?.[0]?.start_time || '',
                    end_time: spot.availability_schedule?.[0]?.end_time || '',
                }
            };

            setIsChanged(false);
            console.log('Initial data set:', initialData.current);
        }
    }, [isOpen, spot]);

    /**
     * Validate Availability Slot
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

    const validateAvailability = () => {
        let isValid = true;
        let errorMsg = '';

        if (is24Seven) {
            // For 24/7, ensure start_time is '00:00' and end_time is '23:59'
            if (timeSlot.start_time !== '00:00' || timeSlot.end_time !== '23:59') {
                isValid = false;
                errorMsg = '24/7 slots must have start time set to 00:00 and end times set to 23:59.';
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
     * Handle 24/7 Toggle
     */
    const handle24SevenToggle = (checked: boolean) => {
        setIs24Seven(checked);
        if (checked) {
            setTimeSlot({
                day_of_week: [],
                start_time: '00:00',
                end_time: '23:59',
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
     * Function to compare two availability schedules
     */
    const areSchedulesEqual = (sched1: any[], sched2: any[]) => {
        if (sched1.length !== sched2.length) return false;
        const sorted1 = [...sched1].sort((a, b) => a.day_of_week.localeCompare(b.day_of_week));
        const sorted2 = [...sched2].sort((a, b) => a.day_of_week.localeCompare(b.day_of_week));
        for (let i = 0; i < sorted1.length; i++) {
            if (
                sorted1[i].day_of_week !== sorted2[i].day_of_week ||
                sorted1[i].start_time !== sorted2[i].start_time ||
                sorted1[i].end_time !== sorted2[i].end_time
            ) {
                return false;
            }
        }
        return true;
    };

    /**
     * Determine if changes require reverification (only address and location)
     */
    const determineReverificationRequirements = (
        original: ParkingSpace,
        updated: Partial<ParkingSpace>
    ): boolean => {
        if (updated.location) {
            const addressChanged = updated.location.address !== original.location.address;
            const latitudeChanged = updated.location.latitude !== original.location.latitude;
            const longitudeChanged = updated.location.longitude !== original.location.longitude;
            return addressChanged || latitudeChanged || longitudeChanged;
        }
        return false;
    };

    /**
     * Handle Form Submission
     */
    const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        setIsSubmitting(true);
        console.log('handleSubmit called');

        // Validate availability before proceeding
        if (!validateAvailability()) {
            toast({
                title: 'Validation Error',
                description: availabilityError || 'Please fix the errors in your availability schedule.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            console.log('Validation failed:', availabilityError);
            return;
        }

        // Validate price (if is_paid)
        if (spot.is_paid && (price === null || isNaN(price) || price < 0)) {
            toast({
                title: 'Invalid Price',
                description: 'Please enter a valid price.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            console.log('Price validation failed:', price);
            return;
        }

        // Validate latitude and longitude
        const parsedLatitude = parseFloat(latitude);
        const parsedLongitude = parseFloat(longitude);

        if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
            toast({
                title: 'Invalid Coordinates',
                description: 'Please enter valid latitude and longitude values.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            console.log('Coordinate validation failed:', { latitude, longitude });
            return;
        }

        // Build the new availability_schedule array based on the current state
        let newAvailabilitySchedule: any[] = [];
        if (spot.is_paid) {
            if (is24Seven) {
                newAvailabilitySchedule = Object.values(DaysOfWeek).map((day) => ({
                    day_of_week: day,
                    start_time: '00:00',
                    end_time: '23:59',
                }));
            } else {
                newAvailabilitySchedule = timeSlot.day_of_week.map((day: DaysOfWeek) => ({
                    day_of_week: day,
                    start_time: timeSlot.start_time,
                    end_time: timeSlot.end_time,
                }));
            }
        }

        // Determine if availability_schedule has changed
        let availabilityChanged = false;
        if (spot.is_paid) {
            availabilityChanged = !areSchedulesEqual(newAvailabilitySchedule, spot?.availability_schedule ?? []);
        }

        // Initialize updatedData with changed fields only
        const updatedData: Partial<ParkingSpace> & { requireReverification?: boolean } = {};

        // Compare and add changed fields
        if (spot.is_paid) {
            // Name Change
            if (name !== initialData.current.name) {
                updatedData.name = name;
                console.log('Name changed:', name);
            }

            // Address or Location Change
            if (
                address !== initialData.current.address ||
                latitude !== initialData.current.latitude ||
                longitude !== initialData.current.longitude
            ) {
                updatedData.location = {
                    address: address !== initialData.current.address ? address : spot.location.address,
                    latitude: latitude !== initialData.current.latitude ? parsedLatitude : spot.location.latitude,
                    longitude: longitude !== initialData.current.longitude ? parsedLongitude : spot.location.longitude,
                };
                console.log('Location changed:', updatedData.location);
            }

            // Price Change
            if (price !== initialData.current.price) {
                updatedData.pricing_info = {
                    ...updatedData.pricing_info,
                    base_price: price!,
                };
                console.log('Price changed:', price);
            }

            // Availability Change
            if (availabilityChanged) {
                updatedData.availability_schedule = newAvailabilitySchedule;
                console.log('Availability changed:', newAvailabilitySchedule);
            }
        }

        // Determine if changes require reverification (only address and location)
        const changesRequireReverification = determineReverificationRequirements(spot, updatedData);
        console.log('Changes require reverification:', changesRequireReverification);

        if (changesRequireReverification) {
            // Store updatedData temporarily and open confirmation dialog
            setPendingSubmit(updatedData);
            setIsReverifyOpen(true);
            setIsSubmitting(false);
            console.log('Opening reverification dialog');
            return;
        }

        // If no changes, do not proceed
        if (Object.keys(updatedData).length === 0) {
            toast({
                title: 'No Changes Detected',
                description: 'You have not made any changes to update.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
            console.log('No changes detected');
            return;
        }

        // Proceed to submit without reverification
        await submitUpdate(updatedData);
    };

    /**
     * Function to submit the update
     */
    const submitUpdate = async (dataToSubmit: Partial<ParkingSpace> & { requireReverification?: boolean }) => {
        try {
            console.log('Submitting update with data:', dataToSubmit);
            // Dispatch the thunk and unwrap the result to catch errors
            // @ts-ignore
            const updatedSpot = await dispatch(updateParkingSpot({ id: spot.id, data: dataToSubmit })).unwrap();
            console.log('Update dispatched successfully:', updatedSpot);

            toast({
                title: 'Spot Updated Successfully!',
                description: 'Your parking spot has been updated.',
            });
            dispatch(resetError());
            onClose();
        } catch (error: any) {
            console.error('Error during update:', error);
            toast({
                title: 'Error',
                description: error || 'Failed to update parking spot.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Handle Confirmation Dialog
     */
    const handleConfirmReverification = () => {
        if (pendingSubmit) {
            const updatedData = { ...pendingSubmit, requireReverification: true };
            setIsReverifyOpen(false);
            setPendingSubmit(null);
            console.log('Confirmed reverification, submitting update with requireReverification: true');
            submitUpdate(updatedData);
        }
    };

    const handleCancelReverification = () => {
        setIsReverifyOpen(false);
        setPendingSubmit(null);
        toast({
            title: 'Update Cancelled',
            description: 'Your changes were not saved.',
            variant: 'destructive',
        });
        console.log('Cancelled reverification');
    };

    /**
     * Reset form when modal closes
     */
    useEffect(() => {
        if (!isOpen) {
            setName((spot.is_paid ? spot.name : '') ?? '');
            setAddress((spot.is_paid ? spot.location.address : '') ?? '');
            setPrice(spot.is_paid ? spot.pricing_info?.base_price || null : null);
            setTimeSlot({
                day_of_week: spot.availability_schedule?.map(s => s.day_of_week) || [],
                start_time: spot.availability_schedule?.[0]?.start_time || '',
                end_time: spot.availability_schedule?.[0]?.end_time || '',
            });
            setIs24Seven(false);
            // @ts-ignore
            setUserLocation(spot.location || null);
            setLatitude(spot.location?.latitude.toString() || '');
            setLongitude(spot.location?.longitude.toString() || '');
            setGeoEnabled(true);
            setLocationLoading(false);
            setAvailabilityError('');
            setIsReverifyOpen(false);
            setPendingSubmit(null);
            setIsChanged(false);
            dispatch(resetError());
            console.log('Form reset');
        }
    }, [isOpen, spot, dispatch]);

    /**
     * Detect Changes
     */
    useEffect(() => {
        const hasNameChanged = spot.is_paid ? name !== initialData.current.name : false;
        const hasAddressChanged = spot.is_paid ? address !== initialData.current.address : false;
        const hasPriceChanged = spot.is_paid ? price !== initialData.current.price : false;
        const hasLatitudeChanged = latitude !== initialData.current.latitude;
        const hasLongitudeChanged = longitude !== initialData.current.longitude;
        const hasIs24SevenChanged = is24Seven !== initialData.current.is24Seven;

        const currentAvailabilitySchedule = is24Seven
            ? Object.values(DaysOfWeek).map((day) => ({
                day_of_week: day,
                start_time: '00:00',
                end_time: '23:59',
            }))
            : timeSlot.day_of_week.map((day: DaysOfWeek) => ({
                day_of_week: day,
                start_time: timeSlot.start_time,
                end_time: timeSlot.end_time,
            }));

        const initialAvailabilitySchedule = is24Seven
            ? Object.values(DaysOfWeek).map((day) => ({
                day_of_week: day,
                start_time: '00:00',
                end_time: '23:59',
            }))
            : spot.availability_schedule?.map(s => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
        })) || [];

        const hasAvailabilityChanged = !areSchedulesEqual(currentAvailabilitySchedule, initialAvailabilitySchedule);

        const anyChange =
            hasNameChanged ||
            hasAddressChanged ||
            hasPriceChanged ||
            hasLatitudeChanged ||
            hasLongitudeChanged ||
            hasIs24SevenChanged ||
            hasAvailabilityChanged;

        setIsChanged(anyChange);

        console.log('Change Detection:', {
            hasNameChanged,
            hasAddressChanged,
            hasPriceChanged,
            hasLatitudeChanged,
            hasLongitudeChanged,
            hasIs24SevenChanged,
            hasAvailabilityChanged,
            anyChange,
        });

    }, [name, address, price, latitude, longitude, is24Seven, timeSlot, spot.availability_schedule]);

    return (
        <>
            {/* Main Modal */}
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

                                    {/* Title */}
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
                                            <div className="flex items-center space-x-2 text-slate-950">
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
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
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
                                                    value={address}
                                                    onChange={(e) => setAddress(e.target.value)}
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
                                                        value={price !== null ? price.toString() : ''}
                                                        onChange={(e) => setPrice(parseFloat(e.target.value))}
                                                        placeholder="e.g. 5.00"
                                                        className="text-slate-950"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Submit Button */}
                                        <Button
                                            type="submit"
                                            className={`w-full ${!isChanged ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                                            disabled={isSubmitting || loading || !isChanged}
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

            {/* Reverification Confirmation Dialog */}
            <AlertDialog open={isReverifyOpen} onOpenChange={setIsReverifyOpen}>
                <AlertDialogOverlay />
                <AlertDialogContent>
                    <AlertDialogTitle>Reverification Required</AlertDialogTitle>
                    <AlertDialogDescription>
                        Modifying the address or location of this parking spot requires reverification. This is a destructive action and will make your spot unavailable for new bookings until it's reverified. Do you want to proceed?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelReverification}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmReverification}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Proceed
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default EditSpotModal;
