import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage'; // Adjust path if necessary
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);

describe('SettingsPage', () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            user: {
                isLoggedIn: true,
                loading: false,
                error: null,
            },
        });
    });

    it('renders settings page with notification options', () => {
        render(
            <Provider store={store}>
                <SettingsPage />
            </Provider>
        );

        // Check if the Settings heading and notification options are rendered
        expect(screen.getByRole('heading', { level: 2, name: /settings/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/push notifications/i)).toBeInTheDocument();
    });

    it('opens the delete account dialog when clicking "Delete My Account"', () => {
        render(
            <Provider store={store}>
                <SettingsPage />
            </Provider>
        );

        // Check if the delete account button is rendered
        const deleteButton = screen.getByRole('button', { name: /delete my account/i });
        expect(deleteButton).toBeInTheDocument();

        // Simulate clicking the delete button
        fireEvent.click(deleteButton);

        // Check if the confirmation dialog appears
        expect(screen.getByText(/confirm account deletion/i)).toBeInTheDocument();
        expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
    });

    it('validates password and confirm password fields correctly', async () => {
        render(
            <Provider store={store}>
                <SettingsPage />
            </Provider>
        );

        // Simulate clicking the delete button
        fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));

        // Simulate clicking submit without entering any password
        fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

        // Ensure validation errors appear
        await waitFor(() => {
            expect(screen.getByText(/password is required/i)).toBeInTheDocument();
            expect(screen.queryAllByText(/confirm your password/i)[0]).toBeInTheDocument();
        });

        // Simulate typing mismatched passwords
        fireEvent.change(screen.queryAllByLabelText(/password/i)[0], { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password124' } });

        // Simulate clicking submit and ensure mismatch error appears
        fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));
        await waitFor(() => {
            expect(screen.getByText(/your passwords do not match/i)).toBeInTheDocument();
        });
    });

    // You can add more tests for actions that would trigger Redux actions, like form submissions or API calls
});
