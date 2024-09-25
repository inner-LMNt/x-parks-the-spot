'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import {ReactNode, useEffect} from 'react';
import { setUpMocks } from '@/mocks/browser';

export function Providers({ children }: { children: ReactNode }) {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            setUpMocks().catch(console.error);
        }
    }, []);

    return <Provider store={store}>{children}</Provider>;
}