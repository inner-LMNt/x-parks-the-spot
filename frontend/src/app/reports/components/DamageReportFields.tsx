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
import { Reservation } from '@/types/type';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchReservationCar } from '@/features/cars/reservationCarSlice';

interface DamageReportFieldsProps {
    form: any;
    handleReservationSelect: (value: string) => void;
    selectedReservation: Reservation | null;
    imageUploadProps: any; // Adjust this according to your actual props
}

export const DamageReportFields = ({
                                       form,
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

            {/* Display car info in a compact form */}
            {selectedReservation && carInfo && (
                <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium">
                        Car: {carInfo.make} {carInfo.model}
                    </p>
                    <p className="text-sm text-gray-600">
                        License Plate: {carInfo.license_plate}
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
