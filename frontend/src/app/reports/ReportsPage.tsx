'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserReports, submitReport, resetReportsError } from '@/features/reports/reportSlice';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { Report, ReportCreateRequest, Reservation } from '@/types/type';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, PlusCircle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Helper function to truncate text after a certain number of characters
function truncateText(text: string | undefined, maxLength: number): string {
    if (!text || text.length <= maxLength) return text as string;
    return `${text.slice(0, maxLength)}...`;
}

// Helper function to format dates safely
const safeFormatDate = (dateString: string | undefined, dateFormat: string): string => {
    const date = new Date(dateString as string);
    return isValid(date) ? format(date, dateFormat) : 'Invalid date';
};

const FormSchema = z.object({
    reservation_id: z.string().nonempty('Please select a reservation.'),
    description: z.string().min(10, 'Description must be at least 10 characters long.'),
});

type FormValues = z.infer<typeof FormSchema>;

export default function ReportsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { reports, loading: reportsLoading, error: reportsError } = useAppSelector((state) => state.reports);
    const { reservations, loading: reservationsLoading, error: reservationsError } = useAppSelector((state) => state.reservations);

    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            reservation_id: '',
            description: '',
        },
    });

    useEffect(() => {
        dispatch(fetchUserReports());
        dispatch(fetchUserReservations());

        // Cleanup on unmount
        return () => {
            dispatch(resetReportsError());
        };
    }, [dispatch]);

    useEffect(() => {
        if (reportsError) {
            toast({
                title: 'Error',
                description: reportsError,
                variant: 'destructive',
            });
            dispatch(resetReportsError());
        }

        if (reservationsError) {
            toast({
                title: 'Error',
                description: reservationsError,
                variant: 'destructive',
            });
            // Optionally reset reservations error if you have such an action
        }
    }, [reportsError, reservationsError, dispatch]);

    const toggleReport = (reportId: string) => {
        setExpandedReportId(expandedReportId === reportId ? null : reportId);
    };

    const handleSubmitReport = async (data: FormValues) => {
        const reportData: { reservation_id: string; description: string } = {
            reservation_id: data.reservation_id,
            description: data.description,
        };

        try {
            // @ts-ignore
            await dispatch(submitReport(reportData));
            toast({
                title: 'Report Submitted',
                description: 'Your reservation dispute has been submitted successfully.',
                variant: 'success',
            });
            // Reset form
            form.reset();
            // Close the dialog
            setIsDialogOpen(false);
        } catch (err: any) {
            // Errors are handled in the useEffect above
            console.error('Report submission failed:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header Section */}
                <header className="relative flex items-center justify-center mb-6 h-12">
                    <Button
                        variant="ghost"
                        className="absolute left-0 flex items-center text-gray-800"
                        onClick={() => router.back()}
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-950">Your Reports</h1>
                </header>

                {/* Report Issue Button */}
                <div className="flex justify-center mb-6">
                    <Button
                        className="flex items-center"
                        onClick={() => setIsDialogOpen(true)}
                        disabled={reservationsLoading || reservations.length === 0}
                    >
                        <PlusCircle className="mr-2 w-5 h-5" /> Report Issue
                    </Button>
                </div>

                {/* Modal Dialog */}
                <AnimatePresence>
                    {isDialogOpen && (
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="w-96 p-6 relative bg-white rounded-lg shadow-lg">
                                {/* Close Button */}
                                <button
                                    type="button"
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        form.reset();
                                    }}
                                    aria-label="Close Report Issue Modal"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {/* Modal Header */}
                                <div className="mb-4">
                                    <CardTitle className="text-xl text-slate-950">Report a Reservation Dispute</CardTitle>
                                    <CardDescription className="text-slate-600">
                                        Select a reservation and describe the issue you're facing.
                                    </CardDescription>
                                </div>

                                {/* Modal Content */}
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleSubmitReport)} className="space-y-4">
                                        {/* Reservation Selection */}
                                        <FormField
                                            control={form.control}
                                            name="reservation_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Select Reservation</FormLabel>
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={(value) => field.onChange(value)}
                                                            value={field.value}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select a reservation" className="whitespace-normal break-words" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {reservations.map((reservation: Reservation) => (
                                                                    <SelectItem key={reservation.id} value={reservation.id as string}>
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="whitespace-normal break-words">
                                                                                {`${truncateText(reservation.id, 15)} - ${safeFormatDate(reservation.start_time, 'MM/dd')} to ${safeFormatDate(reservation.end_time, 'MM/dd')}`}
                                                                            </span>
                                                                            {reservation.id === field.value && (
                                                                                <Check className="w-4 h-4 text-green-500 ml-2" />
                                                                            )}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Description */}
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Describe the issue"
                                                            {...field}
                                                            className="h-24"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Modal Footer */}
                                        <div className="flex justify-end space-x-2 mt-6">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsDialogOpen(false);
                                                    form.reset();
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={reportsLoading}>
                                                {reportsLoading ? 'Submitting...' : 'Submit'}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reports List */}
                {reportsLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <span className="text-gray-500 text-lg">Loading reports...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reports.length === 0 ? (
                            <p className="text-center text-gray-500">No reports found.</p>
                        ) : (
                            reports.map((report: Report) => (
                                <Card key={report.id} className="shadow-lg">
                                    <CardHeader
                                        className="cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleReport(report.id)}
                                    >
                                        <div>
                                            <CardTitle className="text-xl text-slate-950">{report.type}</CardTitle>
                                            <CardDescription className="text-sm text-slate-600">
                                                {safeFormatDate(report.created_at, 'MM/dd/yyyy')}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center">
                                            <span
                                                className={`mr-2 px-2 py-1 text-xs font-semibold rounded ${getStatusClass(
                                                    report.status
                                                )}`}
                                            >
                                                {formatStatus(report.status)}
                                            </span>
                                            {expandedReportId === report.id ? (
                                                <ChevronUp className="w-4 h-4 text-slate-700" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-700" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    <AnimatePresence>
                                        {expandedReportId === report.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <CardContent className="bg-slate-50">
                                                    <div className="space-y-2">
                                                        <p className="text-slate-950">
                                                            <strong>Reservation:</strong> {report.parking_space_id} -{' '}
                                                            {safeFormatDate(report.start_time, 'MM/dd')} to{' '}
                                                            {safeFormatDate(report.end_time, 'MM/dd')}
                                                        </p>
                                                        <p className="text-slate-950">
                                                            <strong>Description:</strong> {report.description}
                                                        </p>
                                                        {report.admin_response && (
                                                            <p className="text-slate-950">
                                                                <strong>Admin Response:</strong> {report.admin_response}
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper function to get status classes
function getStatusClass(status: string): string {
    switch (status) {
        case 'open':
            return 'bg-blue-100 text-blue-800';
        case 'in_progress':
            return 'bg-yellow-100 text-yellow-800';
        case 'resolved':
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Helper function to format status text
function formatStatus(status: string): string {
    switch (status) {
        case 'open':
            return 'Open';
        case 'in_progress':
            return 'In Progress';
        case 'resolved':
            return 'Resolved';
        default:
            return 'Unknown';
    }
}
