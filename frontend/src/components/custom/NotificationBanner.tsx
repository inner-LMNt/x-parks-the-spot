// src/components/custom/NotificationBanner.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchUserReservationsTimes } from '@/features/reservations/reservationsSlice';
import { get_notification_time } from '@/features/user/userSlice';
import { Reservation } from '@/types/type';
import { useRouter } from 'next/navigation';

const NotificationBanner = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const reservations = useAppSelector((state) => state.reservations.reservationsTimes);
    const notificationTime = useAppSelector((state) => state.user.notificationTime);
    const [upcomingReservation, setUpcomingReservation] = useState<Reservation | null>(null);
    const [endingReservation, setEndingReservation] = useState<Reservation | null>(null);
    const [domLoaded, setDomLoaded] = useState(false);
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const [extendable, setExtendable] = useState(false);
    const isLoggedIn = useAppSelector(state => state.user.isLoggedIn);
    const [refreshKey, setRefreshKey] = useState(0); // State to force re-render
    const firstRender = useRef(true);

    useEffect(() => {
        setDomLoaded(true);
    }, []);

    const checkNotifications = () => {
        const now = new Date();
        const notificationMinutes = parseInt(notificationTime, 10);
        const notificationWindow = new Date(now.getTime() + notificationMinutes * 60 * 1000);    
        const upcoming = reservations.find((reservation: Reservation) => {
            const startTime = reservation.start_time ? new Date(reservation.start_time) : null;
            const minutesUntilStart = startTime ? (startTime.getTime() - now.getTime()) / (60 * 1000) : null;
            return startTime !== null && startTime > now && startTime <= notificationWindow && reservation.status === 'booked';
        });
    
        const ending = reservations.find((reservation: Reservation) => {
            const endTime = reservation.end_time ? new Date(reservation.end_time) : null;
            const minutesUntilEnd = endTime ? (endTime.getTime() - now.getTime()) / (60 * 1000) : null;
            return endTime !== null && endTime > now && endTime <= notificationWindow && reservation.status === 'booked';
        });
    
        setUpcomingReservation(upcoming || null);
        setEndingReservation(ending || null);
    
        if (ending) {
            const oneHourAfterEnd = new Date(new Date(ending.end_time).getTime() + 60 * 60 * 1000);
            const isExtendable = !reservations.some((reservation: Reservation) => {
                const startTime = reservation.start_time ? new Date(reservation.start_time) : null;
                return startTime !== null && startTime <= oneHourAfterEnd && startTime > new Date(ending.end_time);
            });
            setExtendable(isExtendable);
        } else {
            setExtendable(false);
        }
    };

    useEffect(() => {
        const intervalId = setInterval(() => {    
            if (isLoggedIn) {
                dispatch(get_notification_time());
                dispatch(fetchUserReservationsTimes()).then(() => {
                    setRefreshKey(prevKey => prevKey + 1); // Force re-render
                });
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, [isLoggedIn, dispatch]);

    useEffect(() => {
        if (firstRender.current) { // Otherwise, cache is used which may be outdated
            firstRender.current = false;
            return;
        }
        checkNotifications();
    }, [reservations]);

    if ((!upcomingReservation && !endingReservation) || !visible) {
        return null;
    }

    const handleClose = () => {
        setFadeOut(true);
        setTimeout(() => {
            setVisible(false);
        }, 500);
    };

    const handleExtend = () => {
        router.push(`/reservations/${endingReservation?.id}/reserve`);
    };

    return (
        domLoaded && (
            <div className={`fixed top-0 left-0 right-0 bg-blue-500 text-white p-4 text-center z-50 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
                <p>
                    {upcomingReservation && `You have a reservation starting in less than ${notificationTime} minutes!`}
                    {upcomingReservation && <br />}
                    {endingReservation && `You have a reservation ending in less than ${notificationTime} minutes!`}
                    {endingReservation && <br />}
                    {endingReservation && extendable && ' You might be able to extend this reservation.'}
                    {endingReservation && !extendable && ' This reservation is not extendable.'}
                </p>
                <div>
                    {endingReservation && extendable ? (
                        <>
                            <button
                                onClick={handleExtend}
                                className="bg-white text-blue-500 px-4 py-2 rounded-lg mt-2 mr-2"
                            >
                                Extend
                            </button>
                            <button
                                onClick={handleClose}
                                className="bg-white text-blue-500 px-4 py-2 rounded-lg mt-2"
                            >
                                Not now
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleClose}
                            className="bg-white text-blue-500 px-4 py-2 rounded-lg mt-2"
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        )
    );
};

export default NotificationBanner;