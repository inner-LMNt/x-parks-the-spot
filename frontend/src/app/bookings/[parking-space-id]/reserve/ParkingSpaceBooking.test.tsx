// ParkingSpaceBooking.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParkingSpaceBooking from './ParkingSpaceBooking'; // Adjust the import path based on your file structure
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import userEvent from '@testing-library/user-event';
import {
    bookParkingSpace,
    resetError,
} from '@/features/reservations/reservationsSlice';
import {
    fetchParkingSpace,
    unlockParkingSpace,
    lockParkingSpace,
} from "@/features/parking-space/parkingSpaceSlice";
import { toast } from '@/hooks/use-toast';
import {fetchUserCars} from "@/features/cars/carSlice";

// Initialize mock store without middlewares as per your setup
const mockStore = configureStore([]);

// Mock Next.js navigation hooks, including useSearchParams
jest.mock('next/navigation', () => ({
    useRouter: jest.fn().mockReturnValue({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
    }),
    useParams: jest.fn().mockReturnValue({ 'parking-space-id': 'space1' }),
    usePathname: jest.fn().mockReturnValue('/current/path'),
    useSearchParams: jest.fn().mockReturnValue(new URLSearchParams({ previousUrl: '/bookings' })),
}));

// Mock actions from reservationsSlice and parkingSpaceSlice
jest.mock('@/features/reservations/reservationsSlice', () => ({
    bookParkingSpace: jest.fn(),
    resetError: jest.fn(),
}));

jest.mock('@/features/parking-space/parkingSpaceSlice', () => ({
    fetchParkingSpace: jest.fn(),
    lockParkingSpace: jest.fn(),
    unlockParkingSpace: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
    toast: jest.fn(),
}));

describe('ParkingSpaceBooking Component', () => {
    let store: MockStoreEnhanced<unknown, {}>;

    beforeEach(() => {
        store = mockStore({
            user: {
                id: 'user1', // Add user ID
                isLoggedIn: true,
                access_token: 'token',
                location: {
                    latitude: null,
                    longitude: null
                },
                loading: true,
                error: null
            },
            search: {
                loading: false,
                error: null,
                spots: [],
            },
            reservations: {
                loading: false,
                error: null,
                reservations: [],
                carInfos: [
                    {
                        id: 'car1',
                        make: 'Toyota',
                        model: 'Camry',
                        year: 2020,
                        color: 'Blue',
                        license_plate: 'ABC123'
                    },
                    {
                        id: 'car2',
                        make: 'Honda',
                        model: 'Civic',
                        year: 2018,
                        color: 'Red',
                        license_plate: 'XYZ789'
                    }
                ],
            },
            parkingSpace: {
                loading: false,
                error: null,
                parkingSpace: {
                    id: 'space1',
                    owner_id: 'owner1',
                    location: {
                        latitude: 38.37334,
                        longitude: -85.596661,
                        address: '3212 Deer Pointe Pl, Prospect, KY'
                    },
                    is_paid: true,
                    features: ['Covered', 'EV Charging'],
                    availability_schedule: [
                        {
                            day_of_week: 'Tuesday',
                            start_time: '2024-10-15T05:00:00Z',
                            end_time: '2024-10-15T21:00:00Z',
                        },
                        {
                            day_of_week: 'Wednesday',
                            start_time: '2024-10-16T05:00:00Z',
                            end_time: '2024-10-16T21:00:00Z',
                        },
                    ],
                    pricing_info: {
                        base_price: 5,
                        dynamic_pricing: true,
                        dynamic_pricing_algorithm: 'standard',
                    },
                    photos: [
                        'https://example.com/photos/parking1/photo1.jpg',
                        'https://example.com/photos/parking1/photo2.jpg',
                    ],
                    verification_status: 'verified',
                    dynamic_pricing_enabled: true,
                    cancellation_policy: 'Free cancellation up to 24 hours before booking.',
                    locked: false,
                    created_at: '2024-09-01T12:00:00Z',
                    updated_at: '2024-09-15T12:00:00Z',
                },
                lockStatus: 'idle',
                lockExpiresAt: null,
            }
        });
        Element.prototype.scrollIntoView = jest.fn();
        // Mock the implementation of actions to include 'unwrap'
        (fetchParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'parkingSpace/fetchParkingSpace',
            payload: {},
            // Mock 'unwrap' method
            unwrap: jest.fn().mockResolvedValue({ /* mock payload if needed */ }),
        }));
        (lockParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'parkingSpace/lockParkingSpace',
            payload: {},
            unwrap: jest.fn().mockResolvedValue({ /* mock payload */ }),
        }));
        (unlockParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'parkingSpace/unlockParkingSpace',
            payload: {},
            unwrap: jest.fn().mockResolvedValue({ /* mock payload */ }),
        }));
        (bookParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'reservations/bookParkingSpace',
            payload: {},
            unwrap: jest.fn().mockResolvedValue({ /* mock payload */ }),
        }));
        (resetError as jest.Mock).mockReturnValue({ type: 'reservations/resetError' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the ParkingSpaceBooking component with loading state', () => {
        store = mockStore({
            user: {
                id: 'user1', // Ensure user ID is present
                isLoggedIn: true,
                access_token: 'token',
                location: { latitude: null, longitude: null },
                loading: false,
                error: null,
            },
            search: {
                loading: false,
                error: null,
                spots: [],
            },
            reservations: {
                loading: false,
                error: null,
                reservations: [],
                carInfos: [],
            },
            parkingSpace: {
                loading: true, // Loading state
                error: null,
                parkingSpace: null,
                lockStatus: 'idle',
                lockExpiresAt: null,
            },
        });

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    });

    it('renders the ParkingSpaceBooking component with parking space data and car infos', () => {
        store = mockStore({
            user: {
                id: 'user1', // Ensure user ID is present
                isLoggedIn: true,
                access_token: 'token',
                location: { latitude: null, longitude: null },
                loading: false,
                error: null,
            },
            search: {
                loading: false,
                error: null,
                spots: [],
            },
            reservations: {
                loading: false,
                error: null,
                reservations: [],
                carInfos: [
                    {
                        id: 'car1',
                        make: 'Toyota',
                        model: 'Camry',
                        year: 2020,
                        color: 'Blue',
                        license_plate: 'ABC123'
                    },
                    {
                        id: 'car2',
                        make: 'Honda',
                        model: 'Civic',
                        year: 2018,
                        color: 'Red',
                        license_plate: 'XYZ789'
                    }
                ],
            },
            parkingSpace: {
                loading: false,
                error: null,
                parkingSpace: {
                    id: 'space1',
                    owner_id: 'owner1',
                    location: {
                        latitude: 38.37334,
                        longitude: -85.596661,
                        address: '3212 Deer Pointe Pl, Prospect, KY'
                    },
                    is_paid: true,
                    features: ['Covered', 'EV Charging'],
                    availability_schedule: [
                        {
                            day_of_week: 'Tuesday',
                            start_time: '2024-10-15T05:00:00Z',
                            end_time: '2024-10-15T21:00:00Z',
                        },
                        {
                            day_of_week: 'Wednesday',
                            start_time: '2024-10-16T05:00:00Z',
                            end_time: '2024-10-16T21:00:00Z',
                        },
                    ],
                    pricing_info: {
                        base_price: 5,
                        dynamic_pricing: true,
                        dynamic_pricing_algorithm: 'standard',
                    },
                    photos: [
                        'https://example.com/photos/parking1/photo1.jpg',
                        'https://example.com/photos/parking1/photo2.jpg',
                    ],
                    verification_status: 'verified',
                    dynamic_pricing_enabled: true,
                    cancellation_policy: 'Free cancellation up to 24 hours before booking.',
                    locked: false,
                    created_at: '2024-09-01T12:00:00Z',
                    updated_at: '2024-09-15T12:00:00Z',
                },
                lockStatus: 'idle',
                lockExpiresAt: null,
            }
        });

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
        (lockParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'parkingSpace/lockParkingSpace/fulfilled',
            payload: {},
            unwrap: jest.fn().mockResolvedValue({ /* mock payload */ }),
        }));

        render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        expect(lockParkingSpace).toHaveBeenCalledWith({ parking_space_id: 'space1', lock_duration: 'PT5M' });
        expect(toast).not.toHaveBeenCalled();
    });

    it('handles locking failure on mount', async () => {
        (lockParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'parkingSpace/lockParkingSpace/rejected',
            payload: 'Locking failed.',
            unwrap: jest.fn().mockRejectedValue('Locking failed.'), // Reject with string
        }));

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
        // Mock the fulfilled action with .unwrap() resolving to an empty object or relevant payload
        (bookParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'reservations/bookParkingSpace/fulfilled',
            payload: {},
            unwrap: jest.fn().mockResolvedValue({ /* mock payload */ }),
        }));

        // Mock the router's push method correctly
        const pushMock = jest.fn();
        (require('next/navigation').useRouter as jest.Mock).mockReturnValue({
            push: pushMock, // Correctly assign pushMock
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
                parking_space_id: 'space1',
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
        store = mockStore({
            user: {
                id: 'user1', // Ensure user ID is present
                isLoggedIn: true,
                access_token: 'token',
                location: { latitude: null, longitude: null },
                loading: false,
                error: null,
            },
            search: {
                loading: false,
                error: null,
                spots: [],
            },
            reservations: {
                loading: false,
                error: null,
                reservations: [],
                carInfos: [
                    {
                        id: 'car1',
                        make: 'Toyota',
                        model: 'Camry',
                        year: 2020,
                        color: 'Blue',
                        license_plate: 'ABC123'
                    }
                ],
            },
            parkingSpace: {
                loading: false,
                error: null,
                parkingSpace: {
                    id: 'space1',
                    owner_id: 'owner1',
                    location: {
                        latitude: 38.37334,
                        longitude: -85.596661,
                        address: '3212 Deer Pointe Pl, Prospect, KY'
                    },
                    is_paid: true,
                    features: ['Covered', 'EV Charging'],
                    availability_schedule: [
                        {
                            day_of_week: 'Tuesday',
                            start_time: '2024-10-15T05:00:00Z',
                            end_time: '2024-10-15T21:00:00Z',
                        },
                        {
                            day_of_week: 'Wednesday',
                            start_time: '2024-10-16T05:00:00Z',
                            end_time: '2024-10-16T21:00:00Z',
                        },
                    ],
                    pricing_info: {
                        base_price: 5,
                        dynamic_pricing: true,
                        dynamic_pricing_algorithm: 'standard',
                    },
                    photos: [
                        'https://example.com/photos/parking1/photo1.jpg',
                        'https://example.com/photos/parking1/photo2.jpg',
                    ],
                    verification_status: 'verified',
                    dynamic_pricing_enabled: true,
                    cancellation_policy: 'Free cancellation up to 24 hours before booking.',
                    locked: true,
                    created_at: '2024-09-01T12:00:00Z',
                    updated_at: '2024-09-15T12:00:00Z',
                },
                lockStatus: 'locked',
                lockExpiresAt: Date.now() - 1000, // Expired
            }
        });

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
        (unlockParkingSpace as jest.Mock).mockImplementation(() => ({
            type: 'parkingSpace/unlockParkingSpace/fulfilled',
            payload: {},
            unwrap: jest.fn().mockResolvedValue({ /* mock payload */ }),
        }));

        const { unmount } = render(
            <Provider store={store}>
                <ParkingSpaceBooking />
            </Provider>
        );

        unmount();

        expect(unlockParkingSpace).toHaveBeenCalledWith('space1');
    });
});
