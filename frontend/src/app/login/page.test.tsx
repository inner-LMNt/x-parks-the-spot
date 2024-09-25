// src/app/login/page.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);

describe('LoginPage', () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            user: {
                isLoggedIn: false,
                loading: false,
                error: null,
            },
        });
    });

    it('renders login form', () => {
        render(
            <Provider store={store}>
                <LoginPage />
            </Provider>
        );

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('displays error messages for invalid inputs', async () => {
        render(
            <Provider store={store}>
                <LoginPage />
            </Provider>
        );

        // Simulate clicking the sign-in button without entering credentials
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/email is required/i)).toBeInTheDocument();
            expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
    });

    // todo: fix broken test
    // it('submits the form with valid data', async () => {
    //     render(
    //         <Provider store={store}>
    //             <LoginPage />
    //         </Provider>
    //     );
    //
    //     fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    //     fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    //
    //     await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /sign in/i })));
    //
    //     await waitFor(() => {
    //         const actions = store.getActions();
    //         expect(actions).toContainEqual(expect.objectContaining({ type: 'user/login/pending' }));
    //     });
    // });
});
