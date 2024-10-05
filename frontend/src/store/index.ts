// store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/features/user/userSlice';
import searchReducer from '@/features/search/searchSlice';
import reservationsReducer from "@/features/reservations/reservationsSlice";
import { customMiddleware } from './middleware'; // Import your custom middleware

// @ts-ignore
export const store = configureStore({
    reducer: {
        user: userReducer,
        search: searchReducer,
        reservations: reservationsReducer,
        // Add other reducers here
    },
    // @ts-ignore
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(customMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppStore = typeof store;
// @ts-ignore
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;
