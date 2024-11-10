// pages/reports/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    fetchUserReports,
    resetReportsError,
} from '@/features/reports/reportSlice';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { fetchOwnerReservations } from '@/features/owner-reservations/ownerReservationsSlice';
import { ArrowLeft, Layers, AlertCircle, Clock, ShieldX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { AnimatePresence } from 'framer-motion';
import { ReportDialog } from './components/ReportDialog';
import { BookingsReports } from './components/BookingsReports';

export default function ReportsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filter, setFilter] = useState<string | null>(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [selectedReportType, setSelectedReportType] = useState<string | null>(null);

    const { reports, loading: reportsLoading, error: reportsError } = useAppSelector(
        (state) => state.reports
    );
    const { loading: reservationsLoading, error: reservationsError } = useAppSelector(
        (state) => state.reservations
    );
    const { loading: ownerReservationsLoading, error: ownerReservationsError } = useAppSelector(
        (state) => state.ownerReservations
    );

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                dispatch(fetchUserReports()),
                dispatch(fetchUserReservations()),
                dispatch(fetchOwnerReservations())
            ]);
        };
        fetchData();

        return () => {
            dispatch(resetReportsError());
        };
    }, [dispatch]);

    useEffect(() => {
        const errors = [reportsError, reservationsError, ownerReservationsError].filter(Boolean);
        errors.forEach(error => {
            if (error) {
                toast({
                    title: 'Error',
                    description: error,
                    variant: 'destructive',
                });
            }
        });
    }, [reportsError, reservationsError, ownerReservationsError]);

    const handleReportClick = (reservation = null, type = null) => {
        setSelectedReservation(reservation);
        setSelectedReportType(type);
        setIsDialogOpen(true);
    };

    const filteredReports = filter
        ? reports.filter((report) => report.type === filter)
        : reports;

    const isLoading = reportsLoading || reservationsLoading || ownerReservationsLoading;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto max-w-4xl px-4 py-8">
                <header className="relative flex items-center justify-center mb-6">
                    <Button
                        variant="ghost"
                        className="absolute left-0 flex items-center text-gray-800"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-950">Your Reports</h1>
                </header>

                <div className="flex justify-between items-center mb-6">
                    <Select
                        onValueChange={(value) =>
                            value === 'all' ? setFilter(null) : setFilter(value)
                        }
                        value={filter || 'all'}
                    >
                        <SelectTrigger className="w-48 border border-gray-300 rounded-lg shadow-sm text-slate-950">
                            <SelectValue placeholder="Filter by type"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-slate-950">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-slate-700" />
                                    <span>All Reports</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Reservation Issue" className="text-slate-950">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-green-600" />
                                    <span>Reservation Issues</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Renter Overstay" className="text-slate-950">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                    <span>Renter Overstay</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Damage Report" className="text-slate-950">
                                <div className="flex items-center gap-2">
                                    <ShieldX className="w-4 h-4 text-red-600" />
                                    <span>Damage Reports</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Other" className="text-slate-950">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-gray-600" />
                                    <span>Other Issues</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={() => handleReportClick()}
                        className="flex items-center gap-2"
                    >
                        <AlertCircle className="w-4 h-4" />
                        Report Issue
                    </Button>
                </div>

                <AnimatePresence mode="wait">
                    <BookingsReports
                        reports={filteredReports}
                        isLoading={isLoading}
                    />
                </AnimatePresence>

                <ReportDialog
                    isOpen={isDialogOpen}
                    onClose={() => {
                        setIsDialogOpen(false);
                        setSelectedReservation(null);
                        setSelectedReportType(null);
                    }}
                    preselectedReservation={selectedReservation}
                    preselectedType={selectedReportType}
                />
            </div>
        </div>
    );
}