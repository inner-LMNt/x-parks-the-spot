'use client';

import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Loader2 } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';

interface ReservationsGroupSelectProps {
    onChange: (value: string) => void;
    value?: string;
    title?: string;
    isOwnerReservations?: boolean;
}

export const ReservationsGroupSelect = ({
                                            onChange,
                                            value,
                                            title = "Reservations",
                                            isOwnerReservations = false,
                                        }: ReservationsGroupSelectProps) => {
    const {
        reservations,
        loading: reservationsLoading,
    } = useAppSelector((state) => state.reservations);

    const {
        ownerReservations,
        loading: ownerReservationsLoading,
    } = useAppSelector((state) => state.ownerReservations);

    const isLoading = isOwnerReservations ? ownerReservationsLoading : reservationsLoading;
    const reservationsArray = isOwnerReservations ? (ownerReservations || []) : (reservations || []);

    if (isLoading) {
        return (
            <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading reservations...</span>
            </div>
        );
    }

    return (
        <Select onValueChange={onChange} value={value}>
            <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={`Select ${title?.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
                {reservationsArray.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No reservations found</div>
                ) : (
                    reservationsArray.map((reservation) => (
                        <SelectItem
                            key={reservation.id}
                            value={reservation.id}
                        >
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                <div className="flex flex-col">
                                    <div className="font-medium text-sm">
                                        {reservation.name}
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({reservation.status})
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {format(new Date(reservation.start_time), 'MMM d, h:mm a')}
                                    </div>
                                </div>
                            </div>
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    );
};