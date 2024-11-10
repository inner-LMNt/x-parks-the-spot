'use client';

import { useEffect } from 'react';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from './ImageUpload';
import { ReservationsGroupSelect } from './ReservationsGroupSelect';
import { Reservation } from '@/types/type'; // Assuming you have a Reservation type defined
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchReservationCar } from '@/features/cars/reservationCarSlice';

interface DamageReportFieldsProps {
    form: any;
    ownerReservations: Reservation[];
    ownerReservationsLoading: boolean;
    handleReservationSelect: (value: string) => void;
    imageUploadProps: {
        // Remove unused properties since we're not using camera functionality
    };
    selectedReservation: Reservation | null; // Pass the selected reservation
}

export const DamageReportFields = ({
                                       form,
                                       ownerReservations,
                                       ownerReservationsLoading,
                                       handleReservationSelect,
                                       imageUploadProps,
                                       selectedReservation,
                                   }: DamageReportFieldsProps) => {
    const dispatch = useAppDispatch();

    // Fetch car info when a reservation is selected
    useEffect(() => {
        if (selectedReservation && selectedReservation.car_info_id) {
            dispatch(fetchReservationCar(selectedReservation.car_info_id));
        }
    }, [dispatch, selectedReservation]);

    // Get car info from Redux store
    const { carInfo, loading: carInfoLoading } = useAppSelector(
        (state) => state.reservationCar
    );

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

            {/* Display dynamic car info below the form fields */}
            {selectedReservation && carInfo && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md space-y-2">
                    <p>
                        <strong>Car Make:</strong> {carInfo.make}
                    </p>
                    <p>
                        <strong>Car Model:</strong> {carInfo.model}
                    </p>
                    <p>
                        <strong>License Plate:</strong> {carInfo.license_plate}
                    </p>
                </div>
            )}

            <FormField
                control={form.control}
                name="damage_type"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Damage Type</FormLabel>
                        <FormControl>
                            <input
                                type="text"
                                {...field}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="e.g., Scratch, Dent"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="damage_severity"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Damage Severity</FormLabel>
                        <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select severity" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Minor">Minor</SelectItem>
                                    <SelectItem value="Moderate">Moderate</SelectItem>
                                    <SelectItem value="Severe">Severe</SelectItem>
                                </SelectContent>
                            </Select>
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