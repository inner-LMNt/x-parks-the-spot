import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerificationPage from './VerificationPage'; // Adjust the import path based on your file structure
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { getAllPendingSpots, verifyParkingSpot } from '@/features/admin/adminSlice';

// Initialize mock store
const mockStore = configureStore([]);

// Mock actions from adminSlice
jest.mock('@/features/admin/adminSlice', () => ({
    getAllPendingSpots: jest.fn(),
    verifyParkingSpot: jest.fn(),
}));

describe.skip('VerificationPage Component', () => {
    let store: MockStoreEnhanced<unknown, {}>;

    beforeEach(() => {
        store = mockStore({
            admin: {
                loading: false,
                error: null,
                pendingSpots: [
                    {
                        id: '1',
                        name: 'Test Spot',
                        is_paid: true,
                        photos: ['/photo1.jpg'], // Add the correct URL format here
                        verification_photos: ['/photo2.jpg'], // Ensure correct format
                        location: { address: '123 Test St' },
                    },
                ],
            },
        });

        // Mock the implementation of actions
        (getAllPendingSpots as jest.Mock).mockReturnValue({ type: 'admin/getAllPendingSpots' });
    });


    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders the VerificationPage component with loading state', () => {
        store = mockStore({
            admin: {
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

        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
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
            admin: {
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

        // Use getAllByText to select the Close button and interact with the first one
        const closeButtons = screen.getAllByText(/Close/i);
        fireEvent.click(closeButtons[0]);

        await waitFor(() => {
            expect(screen.queryByText(/Verification Photos/i)).not.toBeInTheDocument();
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
