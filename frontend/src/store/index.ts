// store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/features/user/userSlice';
import searchReducer from '@/features/search/searchSlice';
import reservationsReducer from "@/features/reservations/reservationsSlice";
import parkingSpaceReducer from "@/features/parking-space/parkingSpaceSlice";
import { customMiddleware } from './middleware'; // Import your custom middleware
import throttle from 'lodash.throttle';
import { saveState, loadState } from './localStorage';


const throttledSaveState = throttle(() => saveState(store.getState()), 1000);
// @ts-ignore
export const store = configureStore({
    reducer: {
        // @ts-ignore
        user: userReducer,
        // @ts-ignore
        search: searchReducer,
        reservations: reservationsReducer,
        parkingSpace: parkingSpaceReducer
        // Add other reducers here
    },
    // @ts-ignore
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(customMiddleware),
    preloadedState: loadState()
});
store.subscribe(throttledSaveState);
// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppStore = typeof store;
// @ts-ignore
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;
