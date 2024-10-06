// middleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@/store/index'; // Adjust the import path as needed

// @ts-ignore
export const loggerMiddleware: Middleware<{}, RootState> = storeAPI => next => action => {
    console.log('Dispatching action:', action);
    const result = next(action);
    console.log('Next state:', storeAPI.getState());
    return result;
};



// Export an array of middleware to be included in the store
// @ts-ignore
export const customMiddleware = [loggerMiddleware];
