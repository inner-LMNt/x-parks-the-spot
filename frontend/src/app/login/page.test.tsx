// src/app/login/page.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { Provider } from 'react-redux';
import { store } from '../../store';
import {  } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '../../mocks/handlers';

// Setup MSW server
const server = setupServer(...handlers);

// Enable API mocking before tests.
beforeAll(() => server.listen());

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => server.resetHandlers());

// Disable API mocking after the tests are done.
afterAll(() => server.close());

test('successful login redirects to dashboard', async () => {
    render(
        <Provider store={store}>
            <LoginPage />
        </Provider>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for redirect or any state changes
    await waitFor(() => {
        // Assertions based on your redirect logic
        // For example, check if the dashboard page is rendered
    });
});

test('failed login shows error message', async () => {
    // Override the login handler to return a failed response
    server.use(
        rest.post('/login', (req, res, ctx) => {
            return res(
                ctx.status(401),
                ctx.json({ message: 'Invalid email or password.' })
            );
        })
    );

    render(
        <Provider store={store}>
            <LoginPage />
        </Provider>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for error message to appear
    const errorMessage = await screen.findByText(/invalid email or password/i);
    expect(errorMessage).toBeInTheDocument();
});
