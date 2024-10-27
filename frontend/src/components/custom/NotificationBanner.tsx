// src/components/custom/NotificationBanner.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserReservations } from '@/features/reservations/reservationsSlice';
import { Reservation } from '@/types/type';

const NotificationBanner = () => {
    const dispatch = useAppDispatch();
    const reservations = useAppSelector((state) => state.reservations.reservations);
    const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);
    const [domLoaded, setDomLoaded] = useState(false);
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        dispatch(fetchUserReservations());
    }, [dispatch]);

    useEffect(() => {
        setDomLoaded(true);
    }, []);

    useEffect(() => {
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        const upcoming = reservations.find((reservation: Reservation) => {
            const startTime = reservation.start_time ? new Date(reservation.start_time) : null;
            return startTime !== null && startTime > now && startTime <= thirtyMinutesFromNow && reservation.status === 'booked';
        });

        setUpcomingReservation(upcoming || null);
    }, [reservations]);

    if (!upcomingReservation || !visible) {
        return null;
    }

    const handleClose = () => {
        setFadeOut(true);
        setTimeout(() => {
            setVisible(false);
        }, 500);
    };

    return (
        domLoaded && (
            <div className={`fixed top-0 left-0 right-0 bg-blue-500 text-white p-4 text-center z-50 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
                <p>You have a reservation starting in less than 30 minutes!</p>
                <button
                    onClick={handleClose}
                    className="bg-white text-blue-500 px-4 py-2 rounded-lg mt-2"
                >
                    OK
                </button>
            </div>
        )
    );
};

export default NotificationBanner;