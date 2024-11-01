import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ParkingSpaceBooking from './ParkingSpaceBooking';
import { Provider } from 'react-redux';
import userEvent from '@testing-library/user-event';
import { store } from '@/store';
import { injectStore } from "@/api/axiosInstance";
import { login, logout } from "@/features/user/userSlice";

jest.mock('next/navigation', () => ({
    useRouter: jest.fn().mockReturnValue({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
    }),
    useParams: jest.fn().mockReturnValue({ 'parking-space-id': 'fe9e327c-e38e-48e0-82b6-69a2dc300cc3' }),
    usePathname: jest.fn().mockReturnValue('/bookings/[parking-space-id]/reserve'),
    useSearchParams: jest.fn().mockReturnValue(new URLSearchParams({ previousUrl: '/bookings' })),
}));
describe('ParkingSpaceBooking Component', () => {


    beforeEach(async () => {
        jest.clearAllMocks();
        injectStore(store);
        await store.dispatch(
            login({email: 'xparkusr1@gmail.com', password: 'S3CureP@asSw0d'})
        );
    });

    afterEach(async () => {
        await store.dispatch(logout());
    });

    // ... previous tests remain the same ...

    it('prevents submission with invalid times', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        await userEvent.tab();
        const goBackButton = screen.getByRole('button', {name: /Go Back/i});
        expect(goBackButton).toHaveFocus();

        await userEvent.tab();
        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        expect(startDateTimeInput).toHaveFocus();

        // Enter later start time
        await userEvent.type(startDateTimeInput, '2024-11-04T14:00');

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        expect(endDateTimeInput).toHaveFocus();

        // Enter earlier end time
        await userEvent.type(endDateTimeInput, '2024-11-04T12:00');

        // Try to select car
        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select actual car from DB
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        expect(submitButton).toHaveFocus();

        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(screen.getByText(/End time must be after start time/i)).toBeInTheDocument();
        });
    });

    it('enforces minimum booking duration', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        await userEvent.tab();
        await userEvent.tab();

        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        await userEvent.type(startDateTimeInput, '2024-11-04T10:00');

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        await userEvent.type(endDateTimeInput, '2024-11-04T10:30'); // Only 30 minutes

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select actual car
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(screen.getByText(/Booking duration must be at least one hour/i)).toBeInTheDocument();
        });
    });

    it('handles successful booking submission with 24 hour time slot', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        await userEvent.tab();
        await userEvent.tab();

        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        const startTime = '2024-11-04T10:00';
        await userEvent.type(startDateTimeInput, startTime);

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        await userEvent.type(endDateTimeInput, startTime); // Same as start for 24h

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select actual car
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(router.push).toHaveBeenCalledWith('/bookings');
        });
    });

    it('prevents submission with invalid times', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        await userEvent.tab();
        const goBackButton = screen.getByRole('button', {name: /Go Back/i});
        expect(goBackButton).toHaveFocus();

        await userEvent.tab();
        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        expect(startDateTimeInput).toHaveFocus();

        // Enter later start time
        await userEvent.type(startDateTimeInput, '2024-11-04T14:00');

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        expect(endDateTimeInput).toHaveFocus();

        // Enter earlier end time
        await userEvent.type(endDateTimeInput, '2024-11-04T12:00');

        // Try to select car
        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select actual car from DB
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        expect(submitButton).toHaveFocus();

        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(screen.getByText(/End time must be after start time/i)).toBeInTheDocument();
        });
    });

    it('enforces minimum booking duration', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        await userEvent.tab();
        await userEvent.tab();

        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        await userEvent.type(startDateTimeInput, '2024-11-04T10:00');

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        await userEvent.type(endDateTimeInput, '2024-11-04T10:30'); // Only 30 minutes

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select actual car
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(screen.getByText(/Booking duration must be at least one hour/i)).toBeInTheDocument();
        });
    });

    it('handles successful booking submission with 24 hour time slot', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        await userEvent.tab();
        await userEvent.tab();

        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        const startTime = '2024-11-04T10:00';
        await userEvent.type(startDateTimeInput, startTime);

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        await userEvent.type(endDateTimeInput, startTime); // Same as start for 24h

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select actual car
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/bookings');
        });
    });

    it('displays error state when parking space not found', async () => {
        // Use non-existent ID
        jest.spyOn(require('next/navigation'), 'useParams')
            .mockReturnValue({'parking-space-id': '00000000-0000-0000-0000-000000000000'});

        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Error/i)).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /Retry/i})).toBeInTheDocument();
        });
    });

    it('handles expired booking sessions', async () => {
        // First create a successful lock
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        // Then simulate expiration by waiting
        await new Promise(resolve => setTimeout(resolve, 5000));

        await waitFor(() => {
            expect(screen.getByText(/Booking Session Expired/i)).toBeInTheDocument();
            expect(mockPush).toHaveBeenCalledWith('/bookings');
        });
    });

    it('handles booking conflict with existing reservation', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });

        // Try to book during an existing reservation from DB
        // Using time that overlaps with reservation in DB: "time": ["2024-10-26 04:39:00+00","2024-11-08 04:39:00+00"]
        await userEvent.tab();
        await userEvent.tab();

        const startDateTimeInput = screen.getByLabelText(/Start Date & Time/i);
        await userEvent.type(startDateTimeInput, '2024-11-01T10:00');

        await userEvent.tab();
        const endDateTimeInput = screen.getByLabelText(/End Date & Time/i);
        await userEvent.type(endDateTimeInput, '2024-11-01T12:00');

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');

        // Select car
        await waitFor(() => {
            expect(screen.getByText('Honda Piolot (987FGH)')).toBeInTheDocument();
        });
        await userEvent.click(screen.getByText('Honda Piolot (987FGH)'));

        await userEvent.tab();
        const submitButton = screen.getByRole('button', {name: /Book Now/i});
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(screen.getByText(/This time slot is already booked/i)).toBeInTheDocument();
        });
    });

    it('displays all previous reservations for the space', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        // Wait for reservations to load - should see the ones from DB
        await waitFor(() => {
            // Check for one of the known reservations from DB
            expect(screen.getByText(/October 26, 2024/i)).toBeInTheDocument();
            expect(screen.getByText(/987FGH/i)).toBeInTheDocument(); // License plate from DB
        });
    });

    it('unlocks parking space on unmount', async () => {
        const {unmount} = render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Loading/i)).toBeInTheDocument();
        });

        unmount();

        // Check that space can be locked again
        render(
            <Provider store={store}>
                <ParkingSpaceBooking/>
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Start Date & Time/i)).toBeInTheDocument();
        });
    });
});