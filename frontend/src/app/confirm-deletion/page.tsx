'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';

export default function RedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.push('/login');
    }, []);


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4 overflow-hidden">
        </div>
    );
}
