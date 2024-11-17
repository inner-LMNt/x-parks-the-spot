// src/components/dashboard/utils/mockDataGenerator.ts

import { ParkingSpace, Reservation } from '@/types/type';
import { format, subDays, addDays, startOfMonth, endOfMonth } from 'date-fns';

export interface ExtendedParkingSpaceStats extends ParkingSpace {
    historicalOccupancy: number[];
    peakHours: { hour: number; count: number }[];
    repeatBookers: number;
    averageBookingLength: number;
    totalRevenue: number;
    revenueByMonth: { month: string; revenue: number }[];
}

export const formatDate = (dateString: string | undefined | null, formatStr: string): string => {
    return format(new Date(dateString ?? new Date()), formatStr);
};

export const generateSpotStats = (spot: ParkingSpace) => ({
    id: spot.id,
    name: spot.name || 'Unnamed Spot',
    occupancyRate: Math.floor(Math.random() * 100),
    averageBookingLength: Math.floor(Math.random() * 4) + 2,
    totalRevenue: Math.floor(Math.random() * 10000),
    totalBookings: Math.floor(Math.random() * 100),
    repeatBookers: Math.floor(Math.random() * 20),
    basePrice: spot.pricing_info?.base_price || 0,
    monthlyRevenue: Array.from({ length: 12 }, (_, i) => ({
        month: format(addDays(new Date(), i * 30), 'MMM'),
        revenue: Math.floor(Math.random() * 2000)
    })),
    hourlyOccupancy: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        rate: Math.floor(Math.random() * 100)
    })),
    popularDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        bookings: Math.floor(Math.random() * 50)
    }))
});

export const generateReservationStats = (reservation: Reservation) => {
    const carBrands = ['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla'];
    const carModels = ['Camry', 'Civic', 'F-150', '3 Series', 'Model 3'];
    const colors = ['Black', 'White', 'Silver', 'Blue', 'Red'];

    return {
        id: reservation.id,
        renterName: `User ${Math.floor(Math.random() * 1000)}`,
        carDetails: {
            make: carBrands[Math.floor(Math.random() * carBrands.length)],
            model: carModels[Math.floor(Math.random() * carModels.length)],
            year: 2018 + Math.floor(Math.random() * 6),
            color: colors[Math.floor(Math.random() * colors.length)],
            licensePlate: `ABC${Math.floor(Math.random() * 1000)}`
        },
        formattedDates: {
            start: formatDate(reservation.start_time, 'MMM d, yyyy h:mm a'),
            end: formatDate(reservation.end_time, 'MMM d, yyyy h:mm a'),
            created: formatDate(reservation.created_at, 'MMM yyyy')
        }
    };
};

export const generateAggregateStats = (spots: ParkingSpace[], reservations: Reservation[]) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return {
        totalSpots: spots.length,
        activeReservations: reservations.filter(r => r.status === 'active').length || 0,
        totalRevenue: reservations.reduce((acc, r) => acc + (r.price || 0), 0),
        averageRating: spots.reduce((acc, s) => {
            const rating = s.avg_total_rating === 'unrated' ? 0 : Number(s.avg_total_rating || 0);
            return acc + rating;
        }, 0) / (spots.length || 1),
        occupancyRate: Math.round(Math.random() * 100),
        popularTimeSlots: Array.from({ length: 7 }, (_, i) => ({
            day: format(addDays(now, i), 'EEE'),
            bookings: Math.floor(Math.random() * 20)
        })),
        revenueByDay: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(now, i), 'MM/dd'),
            revenue: Math.floor(Math.random() * 500)
        })),
        hourlyRevenue: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            revenue: Math.floor(Math.random() * 200)
        }))
    };
};

export const generatePerformanceMetrics = (spot: ParkingSpace) => {
    return {
        dailyRevenue: Array.from({ length: 7 }, () => Math.floor(Math.random() * 200)),
        occupancyByHour: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            rate: Math.floor(Math.random() * 100)
        })),
        popularDays: Array.from({ length: 7 }, (_, day) => ({
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
            bookings: Math.floor(Math.random() * 50)
        }))
    };
};