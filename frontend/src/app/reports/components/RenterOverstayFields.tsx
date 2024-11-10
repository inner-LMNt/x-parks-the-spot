'use client';

import { format } from 'date-fns';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageUpload } from './ImageUpload';
import {ReservationsGroupSelect} from "./ReservationsGroupSelect";

interface RenterOverstayFieldsProps {
    form: any;
    ownerReservations: any[];
    ownerReservationsLoading: boolean;
    handleReservationSelect: (value: string) => void;
    imageUploadProps: {
        imageSource: 'upload' | 'camera';
        setImageSource: (source: 'upload' | 'camera') => void;
        videoRef: React.RefObject<HTMLVideoElement>;
        handleCapturePhoto: () => void;
    };
}

export const RenterOverstayFields = ({
                                         form,
                                         ownerReservations,
                                         ownerReservationsLoading,
                                         handleReservationSelect,
                                         imageUploadProps
                                     }: RenterOverstayFieldsProps) => {
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

            <FormField
                control={form.control}
                name="departure_time"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Time</FormLabel>
                        <FormControl>
                            <input
                                type="datetime-local"
                                {...field}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                onChange={(e) => {
                                    field.onChange(e);
                                    const selectedRes = ownerReservations.find(
                                        r => r.id === form.getValues('owner_reservation_id')
                                    );
                                    if (selectedRes && e.target.value) {
                                        const newTime = new Date(e.target.value);
                                        const endTime = new Date(selectedRes.end_time);
                                        const durationMinutes = Math.max(0,
                                            Math.round((newTime.getTime() - endTime.getTime()) / 1000 / 60)
                                        );
                                        form.setValue('overstay_duration', durationMinutes.toString());
                                    }
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="overstay_duration"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Overstay Duration (minutes)</FormLabel>
                        <FormControl>
                            <input
                                type="number"
                                {...field}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                readOnly
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

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