import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParkingSpaceDetails from './ParkingSpaceDetails'; // Adjust the import path based on your file structure
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import thunk from 'redux-thunk';
import {
    fetchParkingSpace,
    lockParkingSpace,
    unlockParkingSpace,
    resetError,
} from '@/features/parking-space/parkingSpaceSlice';
import { toast } from '@/hooks/use-toast';

const mockStore = configureStore([]);

// Mock Next.js navigation hooks
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
}));

// Mock actions from parkingSpaceSlice
jest.mock('@/features/parking-space/parkingSpaceSlice', () => ({
    fetchParkingSpace: jest.fn(),
    lockParkingSpace: jest.fn(),
    unlockParkingSpace: jest.fn(),
    resetError: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
    toast: jest.fn(),
}));

describe('ParkingSpaceDetails Component', () => {
    let store: MockStoreEnhanced<unknown, {}>;

    beforeEach(() => {
        store = mockStore({
            user: {
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
                spots: [
                    {
                        id: '5a2b3c4d-5678-90ab-cdef-1234567890ef',
                        owner_id: '523e4567-e89b-12d3-a456-426614174004',
                        location: {
                            latitude: 38.37334,
                            longitude: -85.596661,
                            address: '3212 Deer Pointe Pl, Prospect, KY'
                        },
                        is_paid: true,
                        features: [
                            'Covered',
                            'EV Charging'
                        ],
                        availability_schedule: [
                            {
                                day_of_week: 'Tuesday',
                                start_time: '2024-10-15T05:00:00Z',
                                end_time: '2024-10-15T21:00:00Z'
                            },
                            {
                                day_of_week: 'Wednesday',
                                start_time: '2024-10-16T05:00:00Z',
                                end_time: '2024-10-16T21:00:00Z'
                            }
                        ],
                        pricing_info: {
                            base_price: 5,
                            dynamic_pricing: true,
                            dynamic_pricing_algorithm: 'standard'
                        },
                        photos: [
                            'https://example.com/photos/parking5/photo1.jpg',
                            'https://example.com/photos/parking5/photo2.jpg'
                        ],
                        verification_status: 'verified',
                        dynamic_pricing_enabled: true,
                        cancellation_policy: 'Free cancellation up to 24 hours before booking.',
                        locked: false,
                        created_at: '2024-09-20T12:00:00Z',
                        updated_at: '2024-10-05T12:00:00Z'
                    },
                    {
                        id: '6a2b3c4d-5678-90ab-cdef-1234567890fa',
                        owner_id: '623e4567-e89b-12d3-a456-426614174005',
                        location: {
                            latitude: 38.376391,
                            longitude: -85.593005,
                            address: '12613 Ridgemoor Dr, Prospect, KY'
                        },
                        is_paid: true,
                        features: [
                            'Security Cameras',
                            'EV Charging'
                        ],
                        availability_schedule: [
                            {
                                day_of_week: 'Thursday',
                                start_time: '2024-10-17T04:00:00Z',
                                end_time: '2024-10-17T22:00:00Z'
                            },
                            {
                                day_of_week: 'Friday',
                                start_time: '2024-10-18T04:00:00Z',
                                end_time: '2024-10-18T22:00:00Z'
                            }
                        ],
                        pricing_info: {
                            base_price: 6,
                            dynamic_pricing: false,
                            dynamic_pricing_algorithm: ''
                        },
                        photos: [
                            'https://example.com/photos/parking6/photo1.jpg',
                            'https://example.com/photos/parking6/photo2.jpg'
                        ],
                        verification_status: 'pending',
                        dynamic_pricing_enabled: false,
                        cancellation_policy: 'No cancellations allowed.',
                        locked: false,
                        created_at: '2024-09-25T12:00:00Z',
                        updated_at: '2024-10-10T12:00:00Z'
                    }
                ]
            },
            reservations: {
                loading: false,
                error: null,
                reservations: [
                    {
                        id: '1',
                        parking_space_id: '1a2b3c4d-5678-90ab-cdef-1234567890ab',
                        renter_id: 'user1',
                        owner_id: 'owner1',
                        start_time: '2024-10-03T09:00:00Z',
                        end_time: '2024-10-03T11:00:00Z',
                        status: 'booked',
                        car_info: {
                            id: 'car1',
                            make: 'Toyota',
                            model: 'Camry',
                            year: 2020,
                            color: 'Blue',
                            license_plate: 'ABC123'
                        },
                        created_at: '2024-10-01T12:00:00Z',
                        updated_at: '2024-10-01T12:00:00Z'
                    },
                    {
                        id: '2',
                        parking_space_id: '1a2b3c4d-5678-90ab-cdef-1234567890ab',
                        renter_id: 'user1',
                        owner_id: 'owner1',
                        start_time: '2024-10-15T17:04:00.000Z',
                        end_time: '2024-11-28T18:04:00.000Z',
                        status: 'booked',
                        car_info: {
                            id: 'car2',
                            make: 'Honda',
                            model: 'Civic',
                            year: 2018,
                            color: 'Red',
                            license_plate: 'XYZ789'
                        },
                        created_at: '2024-10-01T12:00:00Z',
                        updated_at: '2024-10-01T12:00:00Z'
                    }
                ],
                carInfos: []
            },
            parkingSpace: {
                loading: false,
                error: null,
                parkingSpace: {
                    id: '1a2b3c4d-5678-90ab-cdef-1234567890ab',
                    owner_id: '623e4567-e89b-12d3-a456-426614174005',
                    location: {
                        latitude: 38.376391,
                        longitude: -85.593005,
                        address: '12613 Ridgemoor Dr, Prospect, KY'
                    },
                    is_paid: true,
                    features: [
                        'Security Cameras',
                        'EV Charging'
                    ],
                    availability_schedule: [
                        {
                            day_of_week: 'Thursday',
                            start_time: '2024-10-17T04:00:00Z',
                            end_time: '2024-10-17T22:00:00Z'
                        },
                        {
                            day_of_week: 'Friday',
                            start_time: '2024-10-18T04:00:00Z',
                            end_time: '2024-10-18T22:00:00Z'
                        }
                    ],
                    pricing_info: {
                        base_price: 6,
                        dynamic_pricing: false,
                        dynamic_pricing_algorithm: ''
                    },
                    photos: [
                        'https://example.com/photos/parking6/photo1.jpg',
                        'https://example.com/photos/parking6/photo2.jpg'
                    ],
                    verification_status: 'pending',
                    dynamic_pricing_enabled: false,
                    cancellation_policy: 'No cancellations allowed.',
                    locked: false,
                    created_at: '2024-09-25T12:00:00Z',
                    updated_at: '2024-10-10T12:00:00Z'
                }
            }
        });

        // Mock the implementation of actions
        (fetchParkingSpace as jest.Mock).mockReturnValue({ type: 'parkingSpace/fetchParkingSpace' });
        (lockParkingSpace as jest.Mock).mockReturnValue({ type: 'parkingSpace/lockParkingSpace' });
        (unlockParkingSpace as jest.Mock).mockReturnValue({ type: 'parkingSpace/unlockParkingSpace' });
        (resetError as jest.Mock).mockReturnValue({ type: 'parkingSpace/resetError' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the ParkingSpaceDetails component with loading state', () => {
        store = mockStore({
            user: {
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
                <ParkingSpaceDetails />
            </Provider>
        );

        expect(screen.getByText(/Loading parking space details.../i)).toBeInTheDocument();
    });

    it('renders the ParkingSpaceDetails component with parking space data', () => {
        store = mockStore({
            user: {
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
                loading: false,
                error: null,
                parkingSpace: {
                    id: 'space1',
                    owner_id: 'owner1',
                    location: {
                        latitude: 38.37334,
                        longitude: -85.596661,
                        address: '3212 Deer Pointe Pl, Prospect, KY',
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
            },
        });

        render(
            <Provider store={store}>
                <ParkingSpaceDetails />
            </Provider>
        );

        // Use getByRole for the heading
        expect(screen.getByRole('heading', { name: '3212 Deer Pointe Pl, Prospect, KY' })).toBeInTheDocument();

        // Fix for the 'Verified' text not found issue
        expect(screen.getByText(/verified/i)).toBeInTheDocument();

        // Verify other details
        expect(screen.getByText('$5/hour')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Covered')).toBeInTheDocument();
        expect(screen.getByText('EV Charging')).toBeInTheDocument();
    });

    it('handles reservation and locking', async () => {
        render(
            <Provider store={store}>
                <ParkingSpaceDetails />
            </Provider>
        );

        // Use findByRole to wait for the button to appear
        const reserveButton = await screen.findByRole('button', { name: /Reserve & Lock/i });
        fireEvent.click(reserveButton);

        await waitFor(() => {
            const { push } = require('next/navigation').useRouter();
            expect(push).toHaveBeenCalledWith('/bookings/space1/reserve?previousUrl=%2Fcurrent%2Fpath');
        });
    });

    it('handles navigation back to bookings', () => {
        render(
            <Provider store={store}>
                <ParkingSpaceDetails />
            </Provider>
        );

        const backButton = screen.getByLabelText(/Go Back to Bookings/i);
        fireEvent.click(backButton);

        const { push } = require('next/navigation').useRouter();
        expect(push).toHaveBeenCalledWith('/bookings');
    });

    it('displays error state and retries', () => {
        // Set the store's state to include an error
        store = mockStore({
            user: {
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
                loading: false,
                error: 'Failed to fetch parking space.',
                parkingSpace: null,
                lockStatus: 'idle',
                lockExpiresAt: null,
            },
        });

        render(
            <Provider store={store}>
                <ParkingSpaceDetails />
            </Provider>
        );

        expect(screen.getByText(/Error: Failed to fetch parking space./i)).toBeInTheDocument();

        const retryButton = screen.getByRole('button', { name: /Retry/i });
        fireEvent.click(retryButton);

        expect(fetchParkingSpace).toHaveBeenCalledWith('space1');
    });

    it('displays no parking space found', () => {
        // Set the store's state to have no parkingSpace data
        store = mockStore({
            user: {
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
                loading: false,
                error: null,
                parkingSpace: null,
                lockStatus: 'idle',
                lockExpiresAt: null,
            },
        });

        render(
            <Provider store={store}>
                <ParkingSpaceDetails />
            </Provider>
        );

        expect(screen.getByText(/No parking space found./i)).toBeInTheDocument();
    });
});
