// ParkingSpaceBooking.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParkingSpaceBooking from './ParkingSpaceBooking'; // Adjust the import path based on your file structure
import {Provider, useDispatch} from 'react-redux';
import userEvent from '@testing-library/user-event';
import {store} from '@/store';
import { toast } from '@/hooks/use-toast';
import {login, logout, register_acc} from "@/features/user/userSlice";
import {injectStore} from "@/api/axiosInstance";
import {lockParkingSpace, unlockParkingSpace} from "@/features/parking-space/parkingSpaceSlice";
import {bookParkingSpace} from "@/features/reservations/reservationsSlice";
import {useAppSelector} from "@/store/hooks";

jest.mock('next/navigation', () => ({
    useRouter: jest.fn().mockReturnValue({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
    }),
    useParams: jest.fn().mockReturnValue({ 'parking-space-id': '1692f1d6-a67b-4659-a555-bdf22359bd24' }),
    usePathname: jest.fn().mockReturnValue('/bookings/[parking-space-id]/reserve'),
    useSearchParams: jest.fn().mockReturnValue(new URLSearchParams({ previousUrl: '/bookings' })),
}));
describe('ParkingSpaceBooking Component', () => {

    beforeEach(async () => {
        injectStore(store);

        await store.dispatch(
            //@ts-ignore
            login({ email: 'testuser@example.com', password: 'password123' })
        );
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await store.dispatch(
            //@ts-ignore
            logout()
        );
    });

    it('renders the ParkingSpaceBooking component with loading state', () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    });

    it('renders the ParkingSpaceBooking component with parking space data and car infos', () => {

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        // Verify parking space address in <h3>
        expect(screen.getByRole('heading', { name: '3212 Deer Pointe Pl, Prospect, KY', level: 3 })).toBeInTheDocument();

        // Verify 'Verified' badge
        expect(screen.getByText(/verified/i)).toBeInTheDocument();

        // Verify pricing information (Assuming your component displays '$5/hour')
        expect(screen.getByText('$5/hour')).toBeInTheDocument();

        // Verify 'Available' status
        expect(screen.getByText('Available')).toBeInTheDocument();

        // Verify features
        expect(screen.getByText('Covered')).toBeInTheDocument();
        expect(screen.getByText('EV Charging')).toBeInTheDocument();

        // Verify car selection options
        expect(screen.getByText(/Select your car/i)).toBeInTheDocument();
        expect(screen.getByText('Toyota Camry (ABC123)')).toBeInTheDocument();
        expect(screen.getByText('Honda Civic (XYZ789)')).toBeInTheDocument();
    });

    it('handles successful locking on mount', async () => {

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        expect(lockParkingSpace).toHaveBeenCalledWith({ parking_space_id: '1692f1d6-a67b-4659-a555-bdf22359bd24', lock_duration: 'PT5M' });
        expect(toast).not.toHaveBeenCalled();
    });

    it('handles locking failure on mount', async () => {

        const { push } = require('next/navigation').useRouter();

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith({
                title: 'Lock Failed',
                description: 'Locking failed.', // Now matches expected string
                variant: 'destructive',
            });

            expect(push).toHaveBeenCalledWith('/bookings');
        });
    });

    it('handles successful booking submission', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        // Simulate user interactions via keyboard navigation

        // Initial focus is on the "Go Back" button (first focusable element)
        await userEvent.tab();

        const goBackButton = screen.getByRole('button', { name: /Go Back/i });
        expect(goBackButton).toHaveFocus();

        // Press Tab to focus on the Start Date & Time input
        await userEvent.tab();
        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        expect(startDateTimeInput).toHaveFocus();

        // Enter a valid start date and time
        await userEvent.type(startDateTimeInput, '2024-10-20T10:00');

        // Press Tab to focus on the End Date & Time input
        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        expect(endDateTimeInput).toHaveFocus();

        // Enter a valid end date and time
        await userEvent.type(endDateTimeInput, '2024-10-20T12:00');

        // Press Tab to focus on the Select Car input
        await userEvent.tab();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard('{Enter}');

        // Wait for the Select dropdown to open and display options
        const carOption = await screen.queryAllByText('Toyota Camry (ABC123)')[0];
        expect(carOption).toBeInTheDocument();

        // Press Tab to focus on the submit button
        await userEvent.tab();
        const submitButton = screen.getByRole('button', { name: /Book Now/i });
        expect(submitButton).toHaveFocus();

        // Press Enter to submit the form
        await userEvent.keyboard('{Enter}');

        // Assertions
        await waitFor(() => {
            expect(bookParkingSpace).toHaveBeenCalledWith({
                parking_space_id: '1692f1d6-a67b-4659-a555-bdf22359bd24',
                start_time: new Date('2024-10-20T10:00:00').toISOString(),
                end_time: new Date('2024-10-20T12:00:00').toISOString(),
                car_info_id: 'car1',
                renter_id: 'user1',
            });

            expect(toast).toHaveBeenCalledWith({
                title: 'Booking Successful',
                description: 'Your reservation has been confirmed.',
                variant: 'default',
            });

            expect(pushMock).toHaveBeenCalledWith('/bookings');
        });
    });


    it('prevents submission with missing car selection', async () => {
        // Mock the router's push method
        const pushMock = jest.fn();
        (require('next/navigation').useRouter as jest.Mock).mockReturnValue({
            push: pushMock,
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            pathname: '/',
            query: {},
        });

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        // Simulate user interactions via keyboard navigation

        // Initial focus is on the "Go Back" button
        await userEvent.tab();

        const goBackButton = screen.getByRole('button', { name: /Go Back/i });
        expect(goBackButton).toHaveFocus();

        // Press Tab to focus on the Start Date & Time input
        await userEvent.tab();
        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        expect(startDateTimeInput).toHaveFocus();

        // Enter a valid start date and time
        await userEvent.type(startDateTimeInput, '2024-10-20T10:00');

        // Press Tab to focus on the End Date & Time input
        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        expect(endDateTimeInput).toHaveFocus();

        // Enter a valid end date and time
        await userEvent.type(endDateTimeInput, '2024-10-20T12:00');

        // Press Tab to focus on the Select Car input
        await userEvent.tab();

        // Do NOT select a car to simulate missing car selection
        await userEvent.tab();
        const submitButton = screen.getByRole('button', { name: /Book Now/i });
        expect(submitButton).toHaveFocus();

        // Press Enter to submit the form
        await userEvent.keyboard('{Enter}');

        // Assertions
        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith({
                title: 'Car Not Selected',
                description: 'Please select a car before proceeding with the booking.',
                variant: 'destructive',
            });

            expect(bookParkingSpace).not.toHaveBeenCalled();
            expect(pushMock).not.toHaveBeenCalled();
        });
    });

    it('prevents submission with invalid times', async () => {
        // Mock the router's push method
        const pushMock = jest.fn();
        (require('next/navigation').useRouter as jest.Mock).mockReturnValue({
            push: pushMock,
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            pathname: '/',
            query: {},
        });

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        // Simulate user interactions via keyboard navigation

        // Initial focus is on the "Go Back" button
        await userEvent.tab();

        const goBackButton = screen.getByRole('button', { name: /Go Back/i });
        expect(goBackButton).toHaveFocus();

        // Press Tab to focus on the Start Date & Time input
        await userEvent.tab();
        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        expect(startDateTimeInput).toHaveFocus();

        // Enter a valid start date and time
        await userEvent.type(startDateTimeInput, '2024-10-20T14:00');

        // Press Tab to focus on the End Date & Time input
        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        expect(endDateTimeInput).toHaveFocus();

        // Enter an invalid end date and time (before start time)
        await userEvent.type(endDateTimeInput, '2024-10-20T12:00');

        // Press Tab to focus on the Select Car input
        await userEvent.tab();

        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard('{Enter}');

        const carOption = await screen.queryAllByText('Toyota Camry (ABC123)')[0];
        expect(carOption).toBeInTheDocument();

        // Press Tab to focus on the submit button
        await userEvent.tab();
        const submitButton = screen.getByRole('button', { name: /Book Now/i });
        expect(submitButton).toHaveFocus();

        // Press Enter to submit the form
        await userEvent.keyboard('{Enter}');

        // Assertions
        await waitFor(() => {
            expect(bookParkingSpace).not.toHaveBeenCalled();
            expect(pushMock).not.toHaveBeenCalled();
        });
    });


    it('handles session expiration', async () => {
        // Set lockExpiresAt to a past time to simulate expiration

        const { push } = require('next/navigation').useRouter();

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith({
                title: 'Booking Session Expired',
                description: 'Your booking session has expired due to inactivity.',
                variant: 'destructive',
            });

            expect(push).toHaveBeenCalledWith('/bookings');
        });
    });

    it('unlocks parking space on unmount', () => {

        const { unmount } = render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        unmount();

        expect(unlockParkingSpace).toHaveBeenCalledWith('1692f1d6-a67b-4659-a555-bdf22359bd24');
    });
});
