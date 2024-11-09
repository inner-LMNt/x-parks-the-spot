'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
    fetchUserReports,
    resetReportsError,
    submitReservationIssueReport,
    submitRenterOverstayReport,
    submitDamageReport,
    submitOtherIssueReport,
} from '@/features/reports/reportSlice';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { fetchOwnerReservations } from '@/features/owner-reservations/ownerReservationsSlice';
import { Reservation } from '@/types/type';
import {
    Card,
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
    AlertCircle,
    ShieldX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookingsReports } from './components/BookingsReport';
import { ConfirmSubmitDialog } from './components/ConfirmSubmitDialog';

// Helper functions
const truncateText = (text: string | undefined, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text as string;
    return `${text.slice(0, maxLength)}...`;
};

const safeFormatDate = (
    dateString: string | undefined,
    dateFormat: string
): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, dateFormat) : 'Invalid date';
};

// Define the schema using discriminated unions
const FormSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('Reservation Issue'),
        reservation_id: z.string().nonempty('Please select a reservation.'),
        description: z
            .string()
            .min(10, 'Description must be at least 10 characters long.'),
    }),
    z.object({
        type: z.literal('Renter Overstay'),
        owner_reservation_id: z
            .string()
            .nonempty('Please select a reservation.'),
        departure_time: z
            .string()
            .nonempty('Please provide departure time.'),
        overstay_duration: z
            .string()
            .nonempty('Please provide overstay duration.'),
        image: z.any().refine((file) => file != null, 'Image is required.'),
        description: z
            .string()
            .min(10, 'Description must be at least 10 characters long.'),
    }),
    z.object({
        type: z.literal('Damage Report'),
        owner_reservation_id: z
            .string()
            .nonempty('Please select a reservation.'),
        damage_type: z.string().nonempty('Please specify damage type.'),
        damage_severity: z
            .string()
            .nonempty('Please specify damage severity.'),
        image: z.any().refine((file) => file != null, 'Image is required.'),
        description: z
            .string()
            .min(10, 'Description must be at least 10 characters long.'),
    }),
    z.object({
        type: z.literal('Other'),
        description: z
            .string()
            .min(10, 'Description must be at least 10 characters long.'),
    }),
]);

type FormValues = z.infer<typeof FormSchema>;

export default function ReportsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { reports, loading: reportsLoading, error: reportsError } =
        useAppSelector((state) => state.reports);
    const {
        reservations,
        loading: reservationsLoading,
        error: reservationsError,
    } = useAppSelector((state) => state.reservations);
    const {
        ownerReservations,
        loading: ownerReservationsLoading,
        error: ownerReservationsError,
    } = useAppSelector((state) => state.ownerReservations);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [pendingSubmission, setPendingSubmission] =
        useState<FormValues | null>(null);
    const [filter, setFilter] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            type: undefined,
        },
    });

    useEffect(() => {
        dispatch(fetchUserReports());
        dispatch(fetchUserReservations());
        dispatch(fetchOwnerReservations()); // Fetch owner reservations
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
        }
        if (ownerReservationsError) {
            toast({
                title: 'Error',
                description: ownerReservationsError,
                variant: 'destructive',
            });
        }
    }, [
        reportsError,
        reservationsError,
        ownerReservationsError,
        dispatch,
    ]);

    const handleSubmitReport = async (data: FormValues) => {
        setPendingSubmission(data);
        setIsConfirmDialogOpen(true);
    };

    const handleConfirmSubmit = async () => {
        if (!pendingSubmission) return;

        const formData = new FormData();
        let resultAction;

        switch (pendingSubmission.type) {
            case 'Reservation Issue':
                formData.append('type', pendingSubmission.type);
                formData.append('reservation_id', pendingSubmission.reservation_id);
                formData.append('description', pendingSubmission.description);
                resultAction = await dispatch(submitReservationIssueReport(formData));
                break;

            case 'Renter Overstay':
                formData.append('type', pendingSubmission.type);
                formData.append('owner_reservation_id', pendingSubmission.owner_reservation_id);
                formData.append('departure_time', pendingSubmission.departure_time);
                formData.append('overstay_duration', pendingSubmission.overstay_duration);
                if (pendingSubmission.image) {
                    formData.append('image', pendingSubmission.image);
                }
                formData.append('description', pendingSubmission.description);
                resultAction = await dispatch(submitRenterOverstayReport(formData));
                break;

            case 'Damage Report':
                formData.append('type', pendingSubmission.type);
                formData.append('owner_reservation_id', pendingSubmission.owner_reservation_id);
                formData.append('damage_type', pendingSubmission.damage_type);
                formData.append('damage_severity', pendingSubmission.damage_severity);
                if (pendingSubmission.image) {
                    formData.append('image', pendingSubmission.image);
                }
                formData.append('description', pendingSubmission.description);
                resultAction = await dispatch(submitDamageReport(formData));
                break;

            case 'Other':
                formData.append('type', pendingSubmission.type);
                formData.append('description', pendingSubmission.description);
                resultAction = await dispatch(submitOtherIssueReport(formData));
                break;

            default:
                return;
        }

        // Handle the resultAction as before
        if (resultAction.meta.requestStatus === 'fulfilled') {
            toast({
                title: 'Report Submitted',
                description: 'Your report has been submitted successfully.',
                variant: 'success',
            });
            form.reset();
            setIsDialogOpen(false);
            setIsConfirmDialogOpen(false);
            setPendingSubmission(null);
        } else if (resultAction.meta.requestStatus === 'rejected') {
            toast({
                title: 'Error',
                description:
                    (resultAction.payload as string) || 'Failed to submit report',
                variant: 'destructive',
            });
        }
    };


    const filteredReports = filter
        ? reports.filter((report: Report) => report.type === filter)
        : reports;

    const selectedReportType = form.watch('type');

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto max-w-4xl">
                <header className="relative flex items-center justify-center mb-6 h-12">
                    <Button
                        variant="ghost"
                        className="absolute left-0 flex items-center text-gray-800"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-950">
                        Your Reports
                    </h1>
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
                                    <Layers className="w-4 h-4 text-slate-700" />
                                    <span>All Reports</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Reservation Issue">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <AlertCircle className="w-4 h-4 text-green-600" />
                                    <span>Reservation Issue</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Renter Overstay">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                    <span>Renter Overstay</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Damage Report">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <ShieldX className="w-4 h-4 text-red-600" />
                                    <span>Damage Report</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Other">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Settings className="w-4 h-4 text-gray-600" />
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
                    >
                        <PlusCircle className="mr-2 w-5 h-5" /> Report Issue
                    </Button>
                </div>

                <AnimatePresence>
                    {isDialogOpen && (
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
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
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>

                                <div className="mb-4">
                                    <CardTitle className="text-xl text-slate-950">
                                        Report an Issue
                                    </CardTitle>
                                    <CardDescription className="text-slate-600">
                                        Select the type of issue and provide the necessary
                                        details.
                                    </CardDescription>
                                </div>

                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(handleSubmitReport)}
                                        className="space-y-4"
                                    >
                                        {/* Report Type Field */}
                                        <FormField
                                            control={form.control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type of Issue</FormLabel>
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={(value) =>
                                                                field.onChange(value)
                                                            }
                                                            value={field.value}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Reservation Issue">
                                                                    <div className="flex items-center gap-2 text-slate-950">
                                                                        <AlertCircle className="w-4 h-4 text-green-600" />
                                                                        <span>Reservation Issue</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="Renter Overstay">
                                                                    <div className="flex items-center gap-2 text-slate-950">
                                                                        <Clock className="w-4 h-4 text-yellow-600" />
                                                                        <span>Renter Overstay</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="Damage Report">
                                                                    <div className="flex items-center gap-2 text-slate-950">
                                                                        <ShieldX className="w-4 h-4 text-red-600" />
                                                                        <span>Damage Report</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="Other">
                                                                    <div className="flex items-center gap-2 text-slate-950">
                                                                        <Settings className="w-4 h-4 text-gray-600" />
                                                                        <span>Other Issues</span>
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Conditionally Render Fields Based on Report Type */}
                                        {selectedReportType === 'Reservation Issue' && (
                                            <ReservationIssueFields
                                                form={form}
                                                reservations={reservations}
                                            />
                                        )}

                                        {selectedReportType === 'Renter Overstay' && (
                                            <RenterOverstayFields
                                                form={form}
                                                ownerReservations={ownerReservations}
                                            />
                                        )}

                                        {selectedReportType === 'Damage Report' && (
                                            <DamageReportFields
                                                form={form}
                                                ownerReservations={ownerReservations}
                                            />
                                        )}

                                        {selectedReportType === 'Other' && (
                                            <OtherIssueFields form={form} />
                                        )}

                                        {/* Submit and Cancel Buttons */}
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
                                            <Button
                                                type="submit"
                                                disabled={reportsLoading}
                                            >
                                                {reportsLoading ? 'Submitting...' : 'Submit'}
                                            </Button>
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
                        onConfirm={handleConfirmSubmit}
                        reportType={pendingSubmission?.type || 'Other'}
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

// Components for each report type fields
const ReservationIssueFields = ({
                                    form,
                                    reservations,
                                }: {
    form: any;
    reservations: Reservation[];
}) => (
    <>
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
                                <SelectValue placeholder="Select a reservation" />
                            </SelectTrigger>
                            <SelectContent>
                                {reservations.map((reservation) => (
                                    <SelectItem
                                        key={reservation.id}
                                        value={reservation.id}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-600" />
                                            <span>{`${truncateText(
                                                reservation.name,
                                                20
                                            )} - ${safeFormatDate(
                                                reservation.start_time,
                                                'MM/dd'
                                            )} to ${safeFormatDate(
                                                reservation.end_time,
                                                'MM/dd'
                                            )}`}</span>
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
    </>
);

const RenterOverstayFields = ({
                                  form,
                                  ownerReservations,
                              }: {
    form: any;
    ownerReservations: Reservation[];
}) => (
    <>
        {/* Owner Reservation Selection */}
        <FormField
            control={form.control}
            name="owner_reservation_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Select Reservation</FormLabel>
                    <FormControl>
                        <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a reservation" />
                            </SelectTrigger>
                            <SelectContent>
                                {ownerReservations.map((reservation) => (
                                    <SelectItem
                                        key={reservation.id}
                                        value={reservation.id}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-600" />
                                            <span>{`${truncateText(
                                                reservation.name,
                                                20
                                            )} - ${safeFormatDate(
                                                reservation.start_time,
                                                'MM/dd'
                                            )} to ${safeFormatDate(
                                                reservation.end_time,
                                                'MM/dd'
                                            )}`}</span>
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

        {/* Expected Departure Time */}
        <FormField
            control={form.control}
            name="departure_time"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Departure Time</FormLabel>
                    <FormControl>
                        <input
                            type="datetime-local"
                            {...field}
                            className="input"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        {/* Overstay Duration */}
        <FormField
            control={form.control}
            name="overstay_duration"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Overstay Duration (minutes)</FormLabel>
                    <FormControl>
                        <input type="number" {...field} className="input" />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        {/* Image Upload */}
        <Controller
            control={form.control}
            name="image"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Photo Evidence</FormLabel>
                    <FormControl>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => field.onChange(e.target.files[0])}
                        />
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
    </>
);

const DamageReportFields = ({
                                form,
                                ownerReservations,
                            }: {
    form: any;
    ownerReservations: Reservation[];
}) => (
    <>
        {/* Owner Reservation Selection */}
        <FormField
            control={form.control}
            name="owner_reservation_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Select Reservation</FormLabel>
                    <FormControl>
                        <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a reservation" />
                            </SelectTrigger>
                            <SelectContent>
                                {ownerReservations.map((reservation) => (
                                    <SelectItem
                                        key={reservation.id}
                                        value={reservation.id}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-600" />
                                            <span>{`${truncateText(
                                                reservation.name,
                                                20
                                            )} - ${safeFormatDate(
                                                reservation.start_time,
                                                'MM/dd'
                                            )} to ${safeFormatDate(
                                                reservation.end_time,
                                                'MM/dd'
                                            )}`}</span>
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

        {/* Damage Type */}
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
                            className="input"
                            placeholder="e.g., Scratch, Dent"
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        {/* Damage Severity */}
        <FormField
            control={form.control}
            name="damage_severity"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Damage Severity</FormLabel>
                    <FormControl>
                        <Select
                            onValueChange={(value) => field.onChange(value)}
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

        {/* Image Upload */}
        <Controller
            control={form.control}
            name="image"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Photo Evidence</FormLabel>
                    <FormControl>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => field.onChange(e.target.files[0])}
                        />
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
    </>
);

const OtherIssueFields = ({ form }: { form: any }) => (
    <>
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
    </>
);