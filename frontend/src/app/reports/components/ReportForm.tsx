'use client';

import React, {useEffect, useState} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { fetchOwnerReservations } from '@/features/owner-reservations/ownerReservationsSlice';
import { submitReservationIssueReport, submitRenterOverstayReport, submitDamageReport, submitOtherIssueReport } from '@/features/reports/reportSlice';

import { ReportTypeSelect } from './ReportTypeSelect';
import { RenterOverstayFields } from './RenterOverstayFields';
import { DamageReportFields } from './DamageReportFields';
import { ReservationIssueFields } from './ReservationIssueFields';
import { DescriptionField } from './DescriptionField';
import { FormActions } from './FormActions';
import { useReportForm } from './useReportForm';
import { FormSchema } from './schema';

interface ReportFormProps {
    onClose: () => void;
    preselectedReservation?: any;
    preselectedType?: string;
}

export const ReportForm = ({
                               onClose,
                               preselectedReservation,
                               preselectedType
                           }: ReportFormProps) => {
    const dispatch = useAppDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { imageSource, setImageSource, videoRef, handleCapturePhoto } = useReportForm();

    const { reservations, loading: reservationsLoading } = useAppSelector((state) => state.reservations);
    const { ownerReservations, loading: ownerReservationsLoading } = useAppSelector((state) => state.ownerReservations);

    // Initialize form
    const form = useForm({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            type: preselectedType || undefined,
            reservation_id: preselectedReservation?.id || undefined,
            owner_reservation_id: preselectedReservation?.id || undefined,
            description: '',
            departure_time: '',
            overstay_duration: '',
            damage_type: '',
            damage_severity: '',
            image: undefined,
        },
    });

    // Fetch reservations on mount
    useEffect(() => {
        const fetchData = async () => {
            const [userReservationsResult, ownerReservationsResult] = await Promise.all([
                dispatch(fetchUserReservations()),
                dispatch(fetchOwnerReservations())
            ]);

            if (fetchUserReservations.rejected.match(userReservationsResult)) {
                toast({
                    title: 'Error',
                    description: userReservationsResult.payload || 'Failed to load user reservations',
                    variant: 'destructive',
                });
            }
            if (fetchOwnerReservations.rejected.match(ownerReservationsResult)) {
                toast({
                    title: 'Error',
                    description: ownerReservationsResult.payload || 'Failed to load owner reservations',
                    variant: 'destructive',
                });
            }
        };
        fetchData();
    }, [dispatch]);

    useEffect(() => {
        if (preselectedReservation && preselectedType === 'Renter Overstay') {
            const now = new Date();
            const endTime = new Date(preselectedReservation.end_time);
            const durationMinutes = Math.max(0,
                Math.round((now.getTime() - endTime.getTime()) / 1000 / 60)
            );

            form.setValue('departure_time', now.toISOString().slice(0, 16));
            form.setValue('overstay_duration', durationMinutes.toString());

            const descriptionDetails = `Vehicle is still on property past scheduled end time.
Renter: ${preselectedReservation.name}
Car Info: ${preselectedReservation.car_info ? `${preselectedReservation.car_info.make} ${preselectedReservation.car_info.model} (${preselectedReservation.car_info.license_plate})` : 'N/A'}
Location: ${preselectedReservation.location?.address || 'N/A'}
Scheduled End Time: ${format(endTime, 'MMM d, yyyy h:mm a')}
Current Overstay: ${durationMinutes} minutes`;

            form.setValue('description', descriptionDetails);
        }
    }, [preselectedReservation, preselectedType, form]);

    const handleReservationSelect = (reservationId: string) => {
        const selectedRes = ownerReservations.find(r => r.id === reservationId);
        if (selectedRes) {
            const now = new Date();
            const endTime = new Date(selectedRes.end_time);
            const durationMinutes = Math.max(0,
                Math.round((now.getTime() - endTime.getTime()) / 1000 / 60)
            );

            if (form.getValues('type') === 'Renter Overstay') {
                form.setValue('departure_time', now.toISOString().slice(0, 16));
                form.setValue('overstay_duration', durationMinutes.toString());

                const descriptionDetails = `Vehicle is still on property past scheduled end time.
Renter: ${selectedRes.name}
Car Info: ${selectedRes.car_info ? `${selectedRes.car_info.make} ${selectedRes.car_info.model} (${selectedRes.car_info.license_plate})` : 'N/A'}
Location: ${selectedRes.location?.address || 'N/A'}
Scheduled End Time: ${format(endTime, 'MMM d, yyyy h:mm a')}
Current Overstay: ${durationMinutes} minutes`;

                form.setValue('description', descriptionDetails);
            } else if (form.getValues('type') === 'Damage Report') {
                const descriptionDetails = `Damage report for:
Renter: ${selectedRes.name}
Car Info: ${selectedRes.car_info ? `${selectedRes.car_info.make} ${selectedRes.car_info.model} (${selectedRes.car_info.license_plate})` : 'N/A'}
Location: ${selectedRes.location?.address || 'N/A'}
Reservation Period: ${format(new Date(selectedRes.start_time), 'MMM d, yyyy h:mm a')} to ${format(endTime, 'MMM d, yyyy h:mm a')}`;

                form.setValue('description', descriptionDetails);
            }
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        const formData = new FormData();

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== '') {
                formData.append(key, data[key]);
            }
        });

        if (data.image) {
            formData.append('image_source', imageSource);
        }

        try {
            let resultAction;
            switch (data.type) {
                case 'Reservation Issue':
                    resultAction = await dispatch(submitReservationIssueReport(formData));
                    break;
                case 'Renter Overstay':
                    resultAction = await dispatch(submitRenterOverstayReport(formData));
                    break;
                case 'Damage Report':
                    resultAction = await dispatch(submitDamageReport(formData));
                    break;
                case 'Other':
                    resultAction = await dispatch(submitOtherIssueReport(formData));
                    break;
            }

            if (resultAction.meta.requestStatus === 'fulfilled') {
                toast({
                    title: 'Success',
                    description: 'Report submitted successfully',
                    variant: 'success',
                });
                onClose();
                form.reset();
            } else {
                throw new Error(resultAction.payload);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to submit report',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedReportType = form.watch('type');
    const imageUploadProps = {
        imageSource,
        setImageSource,
        videoRef,
        handleCapturePhoto,
    };

    return (
        <Form {...form}>
            <ScrollArea className="pr-4">
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <ReportTypeSelect form={form} disabled={!!preselectedType} />

                    {selectedReportType === 'Renter Overstay' && (
                        <RenterOverstayFields
                            form={form}
                            ownerReservations={ownerReservations}
                            ownerReservationsLoading={ownerReservationsLoading}
                            handleReservationSelect={handleReservationSelect}
                            imageUploadProps={imageUploadProps}
                        />
                    )}

                    {selectedReportType === 'Damage Report' && (
                        <DamageReportFields
                            form={form}
                            ownerReservations={ownerReservations}
                            ownerReservationsLoading={ownerReservationsLoading}
                            handleReservationSelect={handleReservationSelect}
                            imageUploadProps={imageUploadProps}
                        />
                    )}

                    {selectedReportType === 'Reservation Issue' && (
                        <ReservationIssueFields
                            form={form}
                            reservations={reservations}
                            reservationsLoading={reservationsLoading}
                        />
                    )}

                    <DescriptionField form={form} />
                    <FormActions onClose={onClose} isSubmitting={isSubmitting} />
                </form>
            </ScrollArea>
        </Form>
    );
};

export default ReportForm;