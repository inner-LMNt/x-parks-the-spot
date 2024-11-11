'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from '@/hooks/use-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { fetchOwnerReservations } from '@/features/owner-reservations/ownerReservationsSlice';
import {
    submitReservationIssueReport,
    submitRenterOverstayReport,
    submitDamageReport,
    submitOtherIssueReport,
} from '@/features/reports/reportSlice';

import { ReportTypeSelect } from './ReportTypeSelect';
import { RenterOverstayFields } from './RenterOverstayFields';
import { DamageReportFields } from './DamageReportFields';
import { ReservationIssueFields } from './ReservationIssueFields';
import { DescriptionField } from './DescriptionField';
import { FormActions } from './FormActions';
import { useReportForm } from './useReportForm';
import { FormSchema } from './schema';
import { Reservation } from '@/types/type'; // Assuming you have a Reservation type defined

interface ReportFormProps {
    onClose: () => void;
    preselectedReservation?: any;
    preselectedType?: string;
}

export const ReportForm = ({
                               onClose,
                               preselectedReservation,
                               preselectedType,
                           }: ReportFormProps) => {
    const dispatch = useAppDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { imageSource, setImageSource, videoRef, handleCapturePhoto } = useReportForm();

    const { reservations, loading: reservationsLoading } = useAppSelector(
        (state) => state.reservations
    );
    const { ownerReservations, loading: ownerReservationsLoading } = useAppSelector(
        (state) => state.ownerReservations
    );

    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(
        preselectedReservation || null
    );

    // Initialize form
    const form = useForm({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            type: preselectedType || undefined,
            reservation_id: preselectedReservation?.id || undefined,
            owner_reservation_id: preselectedReservation?.id || undefined,
            description: '',
            departure_time: '', // Add this
            image: undefined,
        },
    });

    // Fetch reservations on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                await Promise.all([
                    dispatch(fetchUserReservations()),
                    dispatch(fetchOwnerReservations()),
                ]);
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to load reservations',
                    variant: 'destructive',
                });
            }
        };
        fetchData();
    }, [dispatch]);

    const handleReservationSelect = (reservationId: string) => {
        const selectedRes = ownerReservations.find((r) => r.id === reservationId);
        if (selectedRes) {
            setSelectedReservation(selectedRes);
            // Optionally set default departure_time to now
            form.setValue('departure_time', new Date().toISOString().slice(0, 16));
        } else {
            setSelectedReservation(null);
            form.setValue('departure_time', '');
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        const formData = new FormData();

        Object.keys(data).forEach((key) => {
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
                            handleReservationSelect={handleReservationSelect}
                            selectedReservation={selectedReservation}
                            imageUploadProps={imageUploadProps}
                        />
                    )}

                    {selectedReportType === 'Damage Report' && (
                        <DamageReportFields
                            form={form}
                            handleReservationSelect={handleReservationSelect}
                            selectedReservation={selectedReservation}
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