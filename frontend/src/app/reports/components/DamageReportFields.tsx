'use client';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from './ImageUpload';
import { ReservationsGroupSelect } from './ReservationsGroupSelect';

interface DamageReportFieldsProps {
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

export const DamageReportFields = ({
                                       form,
                                       ownerReservations,
                                       ownerReservationsLoading,
                                       handleReservationSelect,
                                       imageUploadProps
                                   }: DamageReportFieldsProps) => (
    <>
        <FormField
            control={form.control}
            name="owner_reservation_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Reported Reservation</FormLabel>
                    <FormControl>
                        <ReservationsGroupSelect
                            reservations={ownerReservations}
                            onChange={(value) => {
                                field.onChange(value);
                                handleReservationSelect(value);
                            }}
                            value={field.value}
                            isLoading={ownerReservationsLoading}
                            title="Reported Reservation"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

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
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
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