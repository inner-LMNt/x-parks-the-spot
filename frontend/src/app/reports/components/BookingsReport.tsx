'use client';

import React, { useState } from 'react';
import { Report } from '@/types/type';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import {
    ChevronDown,
    ChevronUp,
    Settings,
    Clock,
    Calendar,
    Tag,
    User,
    MapPin,
    AlertCircle, ShieldX
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {format, isValid} from "date-fns";
import {Skeleton} from "@/components/ui/skeleton";

const safeFormatDate = (dateString: string | undefined, dateFormat: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isValid(date) ? format(date, dateFormat) : 'Invalid date';
};
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
export const BookingsReports: React.FC<{ reports: Report[]; isLoading?: boolean }> = ({
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
                                    {report.type === 'Reservation Issue' && <AlertCircle className="w-4 h-4 text-green-600" />}
                                    {report.type === 'Renter Overstay' && <Clock className="w-4 h-4 text-yellow-600" />}
                                    {report.type === 'Damage Report' && <ShieldX className="w-4 h-4 text-red-600"/>}
                                    {report.type === 'Other' && <Settings className="w-4 h-4 text-gray-600" />}
                                    <CardTitle className="text-xl text-slate-950">{report.type}</CardTitle>
                                </div>
                                <div className= "items-center gap-1 text-sm text-slate-600">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4" />
                                        <span>Reported: {safeFormatDate(report.created_at, 'MMM dd, yyyy, hh:mm a')}</span>
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