// middleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@/store/index'; // Adjust the import path as needed

// Example: Logger middleware
export const loggerMiddleware: Middleware<{}, RootState> = storeAPI => next => action => {
    console.log('Dispatching action:', action);
    const result = next(action);
    console.log('Next state:', storeAPI.getState());
    return result;
};

// Add any other custom middleware here

// Export an array of middleware to be included in the store
export const customMiddleware = [loggerMiddleware];
