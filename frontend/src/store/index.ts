// store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '@/features/user/userSlice';
import { customMiddleware } from './middleware'; // Import your custom middleware

export const store = configureStore({
    reducer: {
        user: userReducer,
        // Add other reducers here
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(customMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
