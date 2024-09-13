// src/app/dashboard/page.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import Dashboard from './page';
import { Provider } from 'react-redux';

import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);

describe('Dashboard', () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            user: {
                isLoggedIn: true,
                name: 'John Doe',
                email: 'john@example.com',
                permissions: {
                    canRent: true,
                    canList: true,
                    canSpot: true,
                },
            },
            bookings: {
                items: [
                    { id: 1, date: '2023-09-15', location: 'Downtown Parking', duration: '2 hours', cost: 15 },
                ],
            },
            listings: {
                items: [
                    { id: 1, location: 'Home Driveway', availability: 'Weekends', rate: '5/hour' },
                ],
            },
            spottedSpots: {
                items: [
                    { id: 1, location: 'Main St & 5th Ave', reportedAt: '2023-09-10 14:30', status: 'Verified' },
                ],
            },
        });
    });

    it('renders dashboard with all sections when user has all permissions', () => {
        render(
            <Provider store={store}>
                <Dashboard />
            </Provider>
        );

        expect(screen.getByText(/ParkingPass Dashboard/i)).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /my listings/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /my bookings/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /spotted spots/i })).toBeInTheDocument();
    });

    it('displays user bookings', () => {
        render(
            <Provider store={store}>
                <Dashboard />
            </Provider>
        );

        expect(screen.getByText('Downtown Parking')).toBeInTheDocument();
        expect(screen.getByText('2 hours')).toBeInTheDocument();
        expect(screen.getByText('$15')).toBeInTheDocument();
    });

    it('displays user listings', () => {
        render(
            <Provider store={store}>
                <Dashboard />
            </Provider>
        );

        expect(screen.getByText('Home Driveway')).toBeInTheDocument();
        expect(screen.getByText('Weekends')).toBeInTheDocument();
        expect(screen.getByText('$5/hour')).toBeInTheDocument();
    });

    it('displays spotted spots', () => {
        render(
            <Provider store={store}>
                <Dashboard />
            </Provider>
        );

        expect(screen.getByText('Main St & 5th Ave')).toBeInTheDocument();
        expect(screen.getByText('2023-09-10 14:30')).toBeInTheDocument();
        expect(screen.getByText('Verified')).toBeInTheDocument();
    });
});