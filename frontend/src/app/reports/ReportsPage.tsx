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
import { Skeleton } from '@/components/ui/skeleton';
import {
    PlusCircle,
    ChevronDown,
    ChevronUp,
    Settings,
    Wrench,
    DollarSign,
    Layers,
    Clock,
    Calendar,
    Tag,
    User,
    MapPin,
    ArrowLeft
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
    type: z.enum(['Billing', 'Technical', 'Other']),
});

type FormValues = z.infer<typeof FormSchema>;

const ReportSkeleton = () => (
    <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-7 w-48" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            </div>
        </CardHeader>
    </Card>
);
const BookingsReport: React.FC<{ reports: Report[]; isLoading?: boolean }> = ({
                                                                                  reports,
                                                                                  isLoading = false,
                                                                              }) => {
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    const toggleReport = (id: string) => {
        setExpandedReportId(expandedReportId === id ? null : id);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <ReportSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reports.map((report) => (
                <Card key={report.id} className="shadow-lg">
                    <CardHeader
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleReport(report.id)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    {report.type === 'Billing' && <DollarSign className="w-5 h-5 text-green-600" />}
                                    {report.type === 'Technical' && <Wrench className="w-5 h-5 text-blue-600" />}
                                    {report.type === 'Other' && <Settings className="w-5 h-5 text-purple-600" />}
                                    <CardTitle className="text-xl text-slate-950">{report.type} Reservation Issue</CardTitle>
                                </div>
                                <div className= "items-center gap-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4" />
                                        <span>Reported: {safeFormatDate(report.created_at, 'MMM dd, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Tag className="w-4 h-4" />
                                        <span>{report.parking_space_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{report.parking_space_address}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusClass(report.status)}`}>
                                    {formatStatus(report.status)}
                                </span>
                                {expandedReportId === report.id ? (
                                    <ChevronUp className="w-5 h-5 text-slate-700" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-slate-700" />
                                )}
                            </div>
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
                                <CardContent className="bg-slate-50 space-y-6 py-2">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <p className="flex items-center gap-2 text-slate-950">
                                                <Calendar className="w-4 h-4 text-slate-600" />
                                                <span>
                                                    <strong>Reservation Period:</strong><br />
                                                    {safeFormatDate(report.start_time, 'MMM dd, yyyy')} - {safeFormatDate(report.end_time, 'MMM dd, yyyy')}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2 text-slate-950">
                                                <User className="w-4 h-4 text-slate-600" />
                                                <span>
                                                    <strong>Space Owner:</strong><br />
                                                    {report.owner_name}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2 text-slate-950">
                                                <Tag className="w-4 h-4 text-slate-600" />
                                                <span>
                                                    <strong>Reservation ID:</strong><br />
                                                    {report.reservation_id.slice(0, 12)}...
                                                </span>
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="flex items-center gap-2 text-slate-950">
                                                <Clock className="w-4 h-4 text-slate-600" />
                                                <span>
                                                    <strong>Last Updated:</strong><br />
                                                    {safeFormatDate(report.updated_at, 'MMM dd, yyyy HH:mm')}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2 text-slate-950">
                                                <Tag className="w-4 h-4 text-slate-600" />
                                                <span>
                                                    <strong>Parking Space:</strong><br />
                                                    {report.parking_space_name}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2 text-slate-950">
                                                <MapPin className="w-4 h-4 text-slate-600" />
                                                <span>
                                                    <strong>Address:</strong><br />
                                                    {report.parking_space_address}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <motion.div
                                            className="bg-white p-2 my-2 rounded-lg border border-slate-200 drop-shadow-lg"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <p className="text-slate-950 text-sm">
                                                <strong>Description:</strong><br />
                                                {report.description}
                                            </p>
                                        </motion.div>

                                        {report.admin_response && (
                                            <motion.div
                                                className="bg-white p-2 my-2 rounded-lg border border-slate-200 drop-shadow-lg"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <p className="text-slate-950 text-sm">
                                                    <strong>Admin Response:</strong><br />
                                                    {report.admin_response}
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            ))}
        </div>
    );
};

export default function ReportsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { reports, loading: reportsLoading, error: reportsError } = useAppSelector((state) => state.reports);
    const { reservations, loading: reservationsLoading, error: reservationsError } = useAppSelector((state) => state.reservations);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string | null>(null);

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

    const toggleReport = (reportId: string) => {
        setExpandedReportId(expandedReportId === reportId ? null : reportId);
    };

    const handleSubmitReport = async (data: FormValues) => {
        const reportData = {
            reservation_id: data.reservation_id,
            description: data.description,
            type: data.type,
        };

        try {
            // @ts-ignore
            await dispatch(submitReport(reportData));
            toast({
                title: "Report Submitted",
                description: "Your reservation dispute has been submitted successfully.",
                variant: "success",
            });
            form.reset();
            setIsDialogOpen(false);
        } catch (err: any) {
            console.error("Report submission failed:", err);
            toast({
                title: "Error",
                description: reportsError || "Failed to submit report",
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
                            <SelectItem value="Billing">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <DollarSign className="w-4 h-4 text-green-600"/>
                                    <span>Billing Issues</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Technical">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Wrench className="w-4 h-4 text-blue-600"/>
                                    <span>Technical Issues</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Other">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Settings className="w-4 h-4 text-purple-600"/>
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
                                                            <SelectItem value="Billing">
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign className="w-4 h-4 text-green-600"/>
                                                                    <span className="text-slate-950">Billing</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Technical">
                                                                <div className="flex items-center gap-2">
                                                                    <Wrench className="w-4 h-4 text-blue-600"/>
                                                                    <span className="text-slate-950">Technical</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="Other">
                                                                <div className="flex items-center gap-2">
                                                                    <Settings className="w-4 h-4 text-purple-600"/>
                                                                    <span className="text-slate-950">Other</span>
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

                {reportsLoading ? (
                    <BookingsReport reports={[]} isLoading={true} />
                ) : (
                    <BookingsReport reports={filteredReports} />
                )}

            </div>
        </div>
    );
}

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