'use client';

import React, { useState, useEffect } from 'react';
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
    AlertCircle,
    ShieldX,
    Car,
    DollarSign,
    Loader,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import ImageWrapper from '@/components/custom/ImageWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReportDetails } from '@/features/reports/reportDetailsSlice';
import { fetchReservationCar } from '@/features/cars/reservationCarSlice';
import { RootState } from '@/store';

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
    const dispatch = useDispatch();

    // Selectors for report details and car info
    const reportDetails = useSelector((state: RootState) => state.reportDetails);
    const reservationCar = useSelector((state: RootState) => state.reservationCar);

    const toggleReport = (report: Report) => {
        if (expandedReportId === report.id) {
            setExpandedReportId(null);
        } else {
            setExpandedReportId(report.id);
            dispatch(fetchReportDetails(report.id));
            if (report.reservation_id && report.car_info_id) {
                dispatch(fetchReservationCar(report.car_info_id));
            }
        }
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
            {Array.isArray(reports) &&
                reports.map((report) => (
                    <Card key={report.id} className="shadow-lg">
                        <CardHeader
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleReport(report)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {report.type === 'Reservation Issue' && (
                                            <AlertCircle className="w-4 h-4 text-green-600" />
                                        )}
                                        {report.type === 'Renter Overstay' && (
                                            <Clock className="w-4 h-4 text-yellow-600" />
                                        )}
                                        {report.type === 'Damage Report' && (
                                            <ShieldX className="w-4 h-4 text-red-600" />
                                        )}
                                        {report.type === 'Other' && (
                                            <Settings className="w-4 h-4 text-gray-600" />
                                        )}
                                        <CardTitle className="text-xl text-slate-950">{report.type}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            Reported: {safeFormatDate(report.created_at, 'MMM dd, yyyy, hh:mm a')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusClass(
                                            report.status
                                        )}`}
                                    >
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
                                    <CardContent className="bg-slate-50 space-y-4 py-2">
                                        {/* Loading Indicator */}
                                        {reportDetails.loading ? (
                                            <div className="flex justify-center items-center h-40">
                                                <Loader className="w-8 h-8 text-slate-600 animate-spin" />
                                            </div>
                                        ) : (
                                            <>
                                                {/* Compact Layout with Side-by-Side Items */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Left Column */}
                                                    <div className="space-y-2">
                                                        {/* Report ID and Reporter Name */}
                                                        <div className="flex items-center gap-2 text-slate-950">
                                                            <Tag className="w-4 h-4 text-slate-600" />
                                                            <span>
                                                                <strong>ID:</strong> {report.id}
                                                            </span>
                                                            {reportDetails.data?.reporter_name && (
                                                                <>
                                                                    <User className="w-4 h-4 text-slate-600 ml-4" />
                                                                    <span>
                                                                        <strong>Reporter:</strong>{' '}
                                                                        {reportDetails.data.reporter_name}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {/* Last Updated and Status */}
                                                        <div className="flex items-center gap-2 text-slate-950">
                                                            <Clock className="w-4 h-4 text-slate-600" />
                                                            <span>
                                                                <strong>Updated:</strong>{' '}
                                                                {safeFormatDate(
                                                                    report.updated_at,
                                                                    'MMM dd, yyyy, hh:mm a'
                                                                )}
                                                            </span>
                                                        </div>
                                                        {/* Owner Name */}
                                                        {reportDetails.data?.owner_name && (
                                                            <div className="flex items-center gap-2 text-slate-950">
                                                                <User className="w-4 h-4 text-slate-600" />
                                                                <span>
                                                                    <strong>Owner:</strong>{' '}
                                                                    {reportDetails.data.owner_name}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Car Information */}
                                                        {reservationCar.carInfo && (
                                                            <div className="flex items-center gap-2 text-slate-950">
                                                                <Car className="w-4 h-4 text-slate-600" />
                                                                <span>
                                                                    <strong>Car:</strong>{' '}
                                                                    {reservationCar.carInfo.make}{' '}
                                                                    {reservationCar.carInfo.model} (
                                                                    {reservationCar.carInfo.license_plate})
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Right Column */}
                                                    <div className="space-y-2">
                                                        {/* Parking Space Name and Address */}
                                                        {report.parking_space_name && (
                                                            <div className="flex items-center gap-2 text-slate-950">
                                                                <MapPin className="w-4 h-4 text-slate-600" />
                                                                <span>
                                                                    <strong>Space:</strong>{' '}
                                                                    {report.parking_space_name}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {report.parking_space_address && (
                                                            <div className="flex items-center gap-2 text-slate-950">
                                                                <MapPin className="w-4 h-4 text-slate-600" />
                                                                <span>
                                                                    <strong>Address:</strong>{' '}
                                                                    {report.parking_space_address}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Reservation Period */}
                                                        {report.start_time && report.end_time && (
                                                            <div className="flex items-center gap-2 text-slate-950">
                                                                <Calendar className="w-4 h-4 text-slate-600" />
                                                                <span>
                                                                    <strong>Reservation:</strong>{' '}
                                                                    {safeFormatDate(
                                                                        report.start_time,
                                                                        'MMM dd, yyyy, hh:mm a'
                                                                    )}{' '}
                                                                    -{' '}
                                                                    {safeFormatDate(
                                                                        report.end_time,
                                                                        'MMM dd, yyyy, hh:mm a'
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Additional Fields Based on Report Type */}
                                                        {report.type === 'Renter Overstay' && (
                                                            <>
                                                                {/* Departure Time */}
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <Clock className="w-4 h-4 text-slate-600" />
                                                                    <span>
                                                                        <strong>Departure:</strong>{' '}
                                                                        {safeFormatDate(
                                                                            report.departure_time,
                                                                            'MMM dd, yyyy, hh:mm a'
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                {/* Overstay Duration and Charge */}
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <Clock className="w-4 h-4 text-slate-600" />
                                                                    <span>
                                                                        <strong>Overstay:</strong>{' '}
                                                                        {report.overstay_duration} mins
                                                                    </span>
                                                                    <DollarSign className="w-4 h-4 text-slate-600 ml-4" />
                                                                    <span>
                                                                        <strong>Charge:</strong> $
                                                                        {report.overstay_charge}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {report.type === 'Damage Report' && (
                                                            <>
                                                                {/* Damage Type and Severity */}
                                                                <div className="flex items-center gap-2 text-slate-950">
                                                                    <Tag className="w-4 h-4 text-slate-600" />
                                                                    <span>
                                                                        <strong>Damage:</strong>{' '}
                                                                        {report.damage_type}
                                                                    </span>
                                                                    <span className="ml-4">
                                                                        <strong>Severity:</strong>{' '}
                                                                        {report.damage_severity}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Image */}
                                                {report.image_url && (
                                                    <div className="relative w-full h-64 mt-4">
                                                        <ImageWrapper
                                                            src={report.image_url}
                                                            alt={report.parking_space_name || 'Report Image'}
                                                            layout="fill"
                                                            objectFit="cover"
                                                            className="object-cover rounded-lg border border-slate-200"
                                                        />
                                                    </div>
                                                )}

                                                {/* Description and Admin Response */}
                                                <div className="space-y-2 mt-4">
                                                    <div className="bg-white p-2 rounded-lg border border-slate-200 drop-shadow-sm">
                                                        <p className="text-slate-950 text-sm">
                                                            <strong>Description:</strong> {report.description}
                                                        </p>
                                                    </div>

                                                    {/* Admin Response */}
                                                    {report.admin_response && (
                                                        <div className="bg-white p-2 rounded-lg border border-slate-200 drop-shadow-sm">
                                                            <p className="text-slate-950 text-sm">
                                                                <strong>Admin Response:</strong>{' '}
                                                                {report.admin_response}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                ))}
        </div>
    );
};
