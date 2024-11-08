'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserReports, submitReport, resetReportsError } from '@/features/reports/reportSlice';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { Report, Reservation } from '@/types/type';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    PlusCircle,
    Settings,
    Layers,
    Clock,
    Calendar,
    ArrowLeft,
    AlertCircle, ShieldX
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookingsReports } from "./components/BookingsReport";
import {ConfirmSubmitDialog} from "./components/ConfirmSubmitDialog";


const truncateText = (text: string | undefined, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text as string;
    return `${text.slice(0, maxLength)}...`;
};

const safeFormatDate = (dateString: string | undefined, dateFormat: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, dateFormat) : 'Invalid date';
};

const FormSchema = z.object({
    reservation_id: z.string().nonempty('Please select a reservation.'),
    description: z.string().min(10, 'Description must be at least 10 characters long.'),
    type: z.enum(['Reservation Issue', 'Renter Overstay', 'Damage Report', 'Other']),

    departure_time: z.string().optional(),
    overstay_duration: z.string().optional(),

    damage_type: z.string().optional(),
    damage_severity: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export default function ReportsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { reports, loading: reportsLoading, error: reportsError } = useAppSelector((state) => state.reports);
    const { reservations, loading: reservationsLoading, error: reservationsError } = useAppSelector((state) => state.reservations);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [pendingSubmission, setPendingSubmission] = useState<FormValues | null>(null);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            reservation_id: '',
            description: '',
            type: undefined
        },
    });

    useEffect(() => {
        dispatch(fetchUserReports());
        dispatch(fetchUserReservations());
        return () => dispatch(resetReportsError());
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
        }
    }, [reportsError, reservationsError, dispatch]);

    const handleSubmitReport = async (data: FormValues) => {
        setPendingSubmission(data);
        setIsConfirmDialogOpen(true);
    };

    const handleConfirmSubmit = async (data: FormValues) => {
        if (!pendingSubmission) return;
        // @ts-ignore
        const resultAction = await dispatch(submitReport(data));

        if (submitReport.fulfilled.match(resultAction)) {
            toast({
                title: "Report Submitted",
                description: "Your reservation dispute has been submitted successfully.",
                variant: "success",
            });
            form.reset();
            setIsDialogOpen(false);
            setIsConfirmDialogOpen(false);
            setPendingSubmission(null);
        } else if (submitReport.rejected.match(resultAction)) {
            toast({
                title: "Error",
                description: resultAction.payload || "Failed to submit report",
                variant: "destructive",
            });
        }
    };

    const filteredReports = filter ? reports.filter((report: Report) => report.type === filter) : reports;


    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto max-w-4xl">
                <header className="relative flex items-center justify-center mb-6 h-12">
                    <Button
                        variant="ghost"
                        className="absolute left-0 flex items-center text-gray-800"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="w-5 h-5 mr-1"/>
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-950">Your Reports</h1>
                </header>

                <div className="flex justify-end mb-4">
                    <Select
                        onValueChange={(value) =>
                            value === 'all' ? setFilter(null) : setFilter(value)
                        }
                        value={filter || 'all'}
                    >
                        <SelectTrigger className="w-48 border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg shadow-md overflow-hidden bg-white">
                            <SelectItem value="all">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Layers className="w-4 h-4 text-slate-700"/>
                                    <span>All Reports</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Reservation Issue">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <AlertCircle className="w-4 h-4 text-green-600"/>
                                    <span>Reservation Issue</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Renter Overstay">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Clock className="w-4 h-4 text-yellow-600"/>
                                    <span>Renter Overstay</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Damage Report">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <ShieldX className="w-4 h-4 text-red-600"/>
                                    <span>Damage Report</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Other">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Settings className="w-4 h-4 text-gray-600"/>
                                    <span>Other Issues</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex justify-center mb-6">
                    <Button
                        className="flex items-center"
                        onClick={() => setIsDialogOpen(true)}
                        disabled={reservationsLoading || reservations.length === 0}
                    >
                        <PlusCircle className="mr-2 w-5 h-5"/> Report Issue
                    </Button>
                </div>

                <AnimatePresence>
                    {isDialogOpen && (
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                        >
                            <Card className="w-96 p-6 relative bg-white rounded-lg shadow-lg">
                                <button
                                    type="button"
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        form.reset();
                                    }}
                                    aria-label="Close Report Issue Modal"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                                         viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>

                                <div className="mb-4">
                                    <CardTitle className="text-xl text-slate-950">Report a Reservation Dispute</CardTitle>
                                    <CardDescription className="text-slate-600">
                                        Select a reservation and describe the issue you're facing.
                                    </CardDescription>
                                </div>

                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleSubmitReport)} className="space-y-4">
                                        <FormField control={form.control} name="type" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Type of Issue</FormLabel>
                                                <FormControl>
                                                    <Select onValueChange={(value) => field.onChange(value)}
                                                            value={field.value}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select type"/>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Reservation Issue">
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <AlertCircle className="w-4 h-4 text-green-600"/>
                                                                    <span>Reservation Issue</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Renter Overstay">
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <Clock className="w-4 h-4 text-yellow-600"/>
                                                                    <span>Renter Overstay</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Damage Report">
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <ShieldX className="w-4 h-4 text-red-600"/>
                                                                    <span>Damage Report</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="OTHER">
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <Settings className="w-4 h-4 text-gray-600"/>
                                                                    <span>Other Issues</span>
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="reservation_id" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Select Reservation</FormLabel>
                                                <FormControl>
                                                    <Select onValueChange={(value) => field.onChange(value)}
                                                            value={field.value}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select a reservation"/>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {reservations.map((reservation: Reservation) => (
                                                                <SelectItem key={reservation.id}
                                                                            value={reservation.id as string}>
                                                                    <div className="flex items-center gap-2">
                                                                        <Calendar className="w-4 h-4 text-slate-600"/>
                                                                        <span>{`${truncateText(reservation.name, 20)} - ${safeFormatDate(reservation.start_time, 'MM/dd')} to ${safeFormatDate(reservation.end_time, 'MM/dd')}`}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="description" render={({field}) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Describe the issue" {...field}
                                                              className="h-24"/>
                                                </FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}/>

                                        <div className="flex justify-end space-x-2 mt-6">
                                            <Button type="button" variant="secondary" onClick={() => {
                                                setIsDialogOpen(false);
                                                form.reset();
                                            }}>Cancel</Button>
                                            <Button type="submit"
                                                    disabled={reportsLoading}>{reportsLoading ? 'Submitting...' : 'Submit'}</Button>
                                        </div>
                                    </form>
                                </Form>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Confirmation Dialog */}
                {pendingSubmission && (
                    <ConfirmSubmitDialog
                        isOpen={isConfirmDialogOpen}
                        onClose={() => {
                            setIsConfirmDialogOpen(false);
                            setPendingSubmission(null);
                        }}
                        onConfirm={() => handleConfirmSubmit(pendingSubmission)}
                        reportType={pendingSubmission?.type || 'OTHER'}
                        reportData={pendingSubmission}
                        isSubmitting={reportsLoading}
                    />
                )}

                {reportsLoading ? (
                    <BookingsReports reports={[]} isLoading={true} />
                ) : (
                    <BookingsReports reports={filteredReports} />
                )}

            </div>
        </div>
    );
}