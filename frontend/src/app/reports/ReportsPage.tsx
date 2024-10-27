// src/app/reports/ReportsPage.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserReports, submitReport, resetReportsError } from '@/features/reports/reportSlice';
import { Report, ReportCreateRequest } from '@/types/type';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'; // Using Dialog instead of Modal
import { Filter, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast'; // Ensure this path is correct

export default function ReportsPage() {
    const dispatch = useAppDispatch();
    const { reports, loading, error } = useAppSelector((state) => state.reports);
    const [filter, setFilter] = useState<string>('');

    const [newReport, setNewReport] = useState<ReportCreateRequest>({
        type: 'Billing',
        description: '',
        date: '',
        time: '',
    });

    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    useEffect(() => {
        dispatch(fetchUserReports());

        // Cleanup on unmount
        return () => {
            dispatch(resetReportsError());
        };
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            toast({
                title: 'Error',
                description: error,
                variant: 'destructive',
            });
            dispatch(resetReportsError());
        }
    }, [error, dispatch]);

    const filteredReports = filter
        ? reports.filter((report: Report) => report.type === filter)
        : reports;

    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    const toggleReport = (reportId: string) => {
        setExpandedReportId(expandedReportId === reportId ? null : reportId);
    };

    const handleSubmitReport = async () => {
        // Validate form fields
        if (
            !newReport.type ||
            !newReport.description ||
            !newReport.date ||
            !newReport.time
        ) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields.',
                variant: 'destructive',
            });
            return;
        }

        try {
            // Dispatch the submitReport action
            await dispatch(submitReport(newReport)).unwrap();
            toast({
                title: 'Success',
                description: 'Report submitted successfully!',
                variant: 'success',
            });
            // Reset form
            setNewReport({
                type: 'Billing',
                description: '',
                date: '',
                time: '',
            });
            // Close the dialog
            setIsDialogOpen(false);
        } catch (err) {
            // Errors are handled in the useEffect above
            console.error("Report submission failed:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-950">Your Reports</h1>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2" /> Report Issue
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Report an Issue</DialogTitle>
                                <DialogDescription>
                                    Please fill out the form below to report an issue.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div>
                                    <Label htmlFor="type">Report Type</Label>
                                    <Select
                                        className = "text-slate-950"
                                        id="type"
                                        value={newReport.type}
                                        onChange={(e) =>
                                            setNewReport({ ...newReport, type: e.target.value as ReportCreateRequest['type'] })
                                        }
                                    >
                                        <option value="Billing">Billing</option>
                                        <option value="Technical">Technical</option>
                                        <option value="Other">Other</option>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the issue"
                                        value={newReport.description}
                                        onChange={(e) =>
                                            setNewReport({ ...newReport, description: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="flex space-x-4">
                                    <div className="w-full">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={newReport.date}
                                            onChange={(e) =>
                                                setNewReport({ ...newReport, date: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="w-full">
                                        <Label htmlFor="time">Time</Label>
                                        <Input
                                            id="time"
                                            type="time"
                                            value={newReport.time}
                                            onChange={(e) =>
                                                setNewReport({ ...newReport, time: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitReport}>
                                    Submit
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filter */}
                <div className="flex items-center mb-4">
                    <Filter className="mr-2 text-gray-500" />
                    <Select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-48"
                    >
                        <option value="">All Types</option>
                        <option value="Billing">Billing</option>
                        <option value="Technical">Technical</option>
                        <option value="Other">Other</option>
                    </Select>
                </div>

                {/* Reports List */}
                {loading ? (
                    <div className="flex items-center justify-center">
                        <span className="text-gray-500">Loading reports...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredReports.length === 0 ? (
                            <p className="text-gray-500">No reports found.</p>
                        ) : (
                            filteredReports.map((report: Report) => (
                                <Card key={report.id}>
                                    <CardHeader
                                        className="cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleReport(report.id)}
                                    >
                                        <div>
                                            <CardTitle>{report.type}</CardTitle>
                                            <CardDescription>
                                                {format(new Date(report.created_at), 'PPP p')}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center">
                                            <span className={`mr-2 px-2 py-1 text-xs font-semibold rounded ${getStatusClass(report.status)}`}>
                                                {formatStatus(report.status)}
                                            </span>
                                            {expandedReportId === report.id ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )}
                                        </div>
                                    </CardHeader>
                                    <AnimatePresence>
                                        {expandedReportId === report.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <CardContent>
                                                    <p className="mb-2">
                                                        <strong>Description:</strong> {report.description}
                                                    </p>
                                                    <p className="mb-2">
                                                        <strong>Date:</strong> {report.date}
                                                    </p>
                                                    <p className="mb-2">
                                                        <strong>Time:</strong> {report.time}
                                                    </p>
                                                    {report.admin_response && (
                                                        <p>
                                                            <strong>Admin Response:</strong> {report.admin_response}
                                                        </p>
                                                    )}
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
