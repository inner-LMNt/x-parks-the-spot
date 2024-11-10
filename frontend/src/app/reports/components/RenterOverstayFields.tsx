'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ImageUpload } from './ImageUpload';
import { ReservationsGroupSelect } from './ReservationsGroupSelect';
import { Reservation } from '@/types/type'; // Assuming you have a Reservation type defined
import { Input } from '@/components/ui/input'; // Assuming you have an Input component

interface RenterOverstayFieldsProps {
    form: any;
    ownerReservations: Reservation[];
    ownerReservationsLoading: boolean;
    handleReservationSelect: (value: string) => void;
    imageUploadProps: {
        imageSource: 'upload' | 'camera';
        setImageSource: (source: 'upload' | 'camera') => void;
        videoRef: React.RefObject<HTMLVideoElement>;
        handleCapturePhoto: () => void;
    };
    selectedReservation: Reservation | null; // Pass the selected reservation
}

export const RenterOverstayFields = ({
                                         form,
                                         ownerReservations,
                                         ownerReservationsLoading,
                                         handleReservationSelect,
                                         imageUploadProps,
                                         selectedReservation,
                                     }: RenterOverstayFieldsProps) => {
    const [overstayDuration, setOverstayDuration] = useState<number>(0);
    const [overstayCharge, setOverstayCharge] = useState<number>(0);

    // Use form.watch to subscribe to changes in 'departure_time'
    const departureTimeStr = form.watch('departure_time');

    useEffect(() => {
        if (selectedReservation && departureTimeStr) {
            const departureTime = parseISO(departureTimeStr);
            const endTime = new Date(selectedReservation.end_time);

            // Ensure departureTime is not before reservation end time
            if (departureTime < endTime) {
                setOverstayDuration(0);
                setOverstayCharge(0);
                form.setError('departure_time', {
                    type: 'manual',
                    message: 'Departure time cannot be before reservation end time.',
                });
            } else {
                form.clearErrors('departure_time');
                const durationMinutes = Math.max(
                    0,
                    Math.round((departureTime.getTime() - endTime.getTime()) / 1000 / 60)
                );
                setOverstayDuration(durationMinutes);

                // Calculate the hourly rate
                const reservationDurationHours =
                    (new Date(selectedReservation.end_time).getTime() -
                        new Date(selectedReservation.start_time).getTime()) /
                    (1000 * 60 * 60);

                const hourlyRate = selectedReservation.price / reservationDurationHours;
                const charge = ((hourlyRate * 1.5) / 60) * durationMinutes; // Charge per minute
                setOverstayCharge(charge);

                // Update the description field
                form.setValue(
                    'description',
                    `Overstay of ${durationMinutes} minutes detected for reservation ending at ${format(
                        endTime,
                        'MMM d, yyyy h:mm a'
                    )}.`
                );
            }
        } else {
            // If departure time is not set, reset values
            setOverstayDuration(0);
            setOverstayCharge(0);
        }
    }, [selectedReservation, departureTimeStr, form]);

    return (
        <>
            <FormField
                control={form.control}
                name="owner_reservation_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reported Reservation</FormLabel>
                        <FormControl>
                            <ReservationsGroupSelect
                                onChange={(value) => {
                                    field.onChange(value);
                                    handleReservationSelect(value);
                                }}
                                value={field.value}
                                title="Reported Reservation"
                                isOwnerReservations={true}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Add departure_time input field */}
            <FormField
                control={form.control}
                name="departure_time"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Departure Time</FormLabel>
                        <FormControl>
                            <Input
                                type="datetime-local"
                                {...field}
                                onChange={(e) => {
                                    field.onChange(e);
                                    // No need to handle calculation here since useEffect will handle it
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Display dynamic data directly below the form fields */}
            {selectedReservation && departureTimeStr && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md space-y-2">
                    <p>
                        <strong>Reservation End Time:</strong>{' '}
                        {format(
                            new Date(selectedReservation.end_time),
                            'MMM d, yyyy h:mm a'
                        )}
                    </p>
                    <p>
                        <strong>Overstay Duration:</strong> {overstayDuration} minutes
                    </p>
                    <p>
                        <strong>Overstay Charge:</strong> ${overstayCharge.toFixed(2)}
                    </p>
                </div>
            )}

            <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Photo Evidence</FormLabel>
                        <FormControl>
                            <ImageUpload
                                {...imageUploadProps}
                                onFileSelect={(file) => form.setValue('image', file)}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
};
