import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPage from './page'; // Adjust the import based on your file structure
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';

const mockStore = configureStore([]);

describe('SearchPage', () => {
    let store: MockStoreEnhanced<unknown, {}>;

    beforeEach(() => {
        store = mockStore({
            search: {
                spots: [
                    { id: '1', owner_id: '1001', location: { latitude: 40.4237, longitude: -86.9212 } },
                    { id: '2', owner_id: '1002', location: { latitude: 40.4238, longitude: -86.9213 } },
                ],
            },
        });

        const mockGeolocation = {
            getCurrentPosition: jest.fn((success) =>
                success({ coords: { latitude: 40.4237, longitude: -86.9212 } })
            ),
        };
        Object.defineProperty(global.navigator, 'geolocation', {
            value: mockGeolocation,
            writable: true,
        });
    });

    it('renders the parking finder component', () => {
        render(
            <Provider store={store}>
                <SearchPage />
            </Provider>
        );

        expect(screen.getByText(/Find Parking/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Search Radius:/i)).toBeInTheDocument();
        expect(screen.getByText(/Available Parking Spots/i)).toBeInTheDocument();
    });

    it('displays the user location', async () => {
        render(
            <Provider store={store}>
                <SearchPage />
            </Provider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Selected Parking Spot: None/i)).toBeInTheDocument();
        });
    });

    it('selects and deselects a parking spot', async () => {
        render(
            <Provider store={store}>
                <SearchPage />
            </Provider>
        );
    
        console.log(screen.debug());
    
        const selectButton = await screen.findByTestId('select-1');
    
        fireEvent.click(selectButton);
        expect(screen.getByText(/Selected Parking Spot: 1001/i)).toBeInTheDocument();
    
        fireEvent.click(selectButton);
        expect(screen.getByText(/Selected Parking Spot: None/i)).toBeInTheDocument();
    });
    

    it('searches for parking spots with the user location', async () => {
        render(
            <Provider store={store}>
                <SearchPage />
            </Provider>
        );

        // Check the initial user location
        expect(screen.getByText(/Selected Parking Spot: None/i)).toBeInTheDocument();

        // Set a search radius
        fireEvent.change(screen.getByLabelText(/Search Radius:/i), { target: { value: '10' } });

        // Click the search button
        fireEvent.click(screen.getByRole('button', { name: /Search/i }));

        await waitFor(() => {
            expect(screen.getByText(/Selected Parking Spot: None/i)).toBeInTheDocument();
        });
    });
});
