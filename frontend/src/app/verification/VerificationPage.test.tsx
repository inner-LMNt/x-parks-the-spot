import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerificationPage from './VerificationPage'; // Adjust the import path based on your file structure
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import thunk from 'redux-thunk';
import { fetchPendingVerifications } from '@/features/parking-space/parkingSpaceSlice';
import { toast } from '@/hooks/use-toast';

// Initialize mock store
const mockStore = configureStore([thunk]);

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
}));

// Mock actions from verificationSlice
jest.mock('@/features/verifications/verificationSlice', () => ({
    fetchPendingVerifications: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
    toast: jest.fn(),
}));

describe('VerificationPage Component', () => {
    let store: MockStoreEnhanced<unknown, {}>;

    beforeEach(() => {
        store = mockStore({
            user: {
                isLoggedIn: true,
                access_token: 'token',
                location: { latitude: null, longitude: null },
                loading: false,
                error: null,
            },
            verifications: {
                loading: false,
                error: null,
                pendingSpots: [
                    {
                        id: '1',
                        name: 'Test Spot',
                        is_paid: true,
                        verification_photos: ['photo1.jpg'],
                        location: { address: '123 Test St' },
                    },
                ],
            },
        });

        // Mock the implementation of actions
        (fetchPendingVerifications as jest.Mock).mockReturnValue({ type: 'verifications/fetchPendingVerifications' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the VerificationPage component with loading state', () => {
        store = mockStore({
            user: {
                isLoggedIn: true,
                access_token: 'token',
                location: { latitude: null, longitude: null },
                loading: false,
                error: null,
            },
            verifications: {
                loading: true,
                error: null,
                pendingSpots: [],
            },
        });

        render(
            <Provider store={store}>
                <VerificationPage />
            </Provider>
        );

        expect(screen.getByText(/Loading your pending verifications.../i)).toBeInTheDocument();
    });

    it('renders the VerificationPage component with pending verification spots', () => {
        render(
            <Provider store={store}>
                <VerificationPage />
            </Provider>
        );

        // Verify pending spots are rendered
        expect(screen.getByText('Test Spot')).toBeInTheDocument();
        expect(screen.getByText('123 Test St')).toBeInTheDocument();
        expect(screen.getByText(/View Verification/i)).toBeInTheDocument();
    });

    it('renders no pending verification spots', () => {
        store = mockStore({
            user: {
                isLoggedIn: true,
                access_token: 'token',
                location: { latitude: null, longitude: null },
                loading: false,
                error: null,
            },
            verifications: {
                loading: false,
                error: null,
                pendingSpots: [],
            },
        });

        render(
            <Provider store={store}>
                <VerificationPage />
            </Provider>
        );

        expect(screen.getByText(/No pending verification spots available/i)).toBeInTheDocument();
    });

    it('opens and closes the verification modal', async () => {
        render(
            <Provider store={store}>
                <VerificationPage />
            </Provider>
        );

        const viewVerificationButton = screen.getByText(/View Verification/i);
        fireEvent.click(viewVerificationButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification Photos/i)).toBeInTheDocument();
        });

        const closeButton = screen.getByText(/Close/i);
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByText(/Verification Photos/i)).not.toBeInTheDocument();
        });
    });

    it('opens the confirm modal when verifying or rejecting a spot', async () => {
        render(
            <Provider store={store}>
                <VerificationPage />
            </Provider>
        );

        const verifyButton = screen.getByText(/Verify/i);
        fireEvent.click(verifyButton);

        await waitFor(() => {
            expect(screen.getByText(/Confirm Verification/i)).toBeInTheDocument();
        });

        const confirmInput = screen.getByPlaceholderText(/Type 'confirm' to proceed/i);
        fireEvent.change(confirmInput, { target: { value: 'confirm' } });

        const submitButton = screen.getByText(/Submit/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.queryByText(/Confirm Verification/i)).not.toBeInTheDocument();
        });
    });

    it('displays an error message when confirmation input is incorrect', async () => {
        render(
            <Provider store={store}>
                <VerificationPage />
            </Provider>
        );

        const verifyButton = screen.getByText(/Verify/i);
        fireEvent.click(verifyButton);

        await waitFor(() => {
            expect(screen.getByText(/Confirm Verification/i)).toBeInTheDocument();
        });

        const confirmInput = screen.getByPlaceholderText(/Type 'confirm' to proceed/i);
        fireEvent.change(confirmInput, { target: { value: 'wrong' } });

        const submitButton = screen.getByText(/Submit/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/You must type 'confirm' to proceed/i)).toBeInTheDocument();
        });
    });
});
