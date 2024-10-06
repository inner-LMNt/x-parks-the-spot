import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/features/user/userSlice';
import searchReducer from '@/features/search/searchSlice';
import reservationsReducer from "@/features/reservations/reservationsSlice";
import parkingSpaceReducer from "@/features/parking-space/parkingSpaceSlice";
import { customMiddleware } from './middleware'; // Import your custom middleware
import throttle from 'lodash.throttle';
import { saveState, loadState } from './localStorage';

// Function to create and configure the store
export const createStore = (preloadedState?: Partial<RootState>) => {
    const store = configureStore({
        reducer: {
            user: userReducer,
            search: searchReducer,
            reservations: reservationsReducer,
            parkingSpace: parkingSpaceReducer
            // Add other reducers here
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(customMiddleware),
        preloadedState: preloadedState || loadState()
    });

    const throttledSaveState = throttle(() => saveState(store.getState()), 1000);
    store.subscribe(throttledSaveState);

    return store;
};

// Initialize the store for the application
export const store = createStore();

// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
