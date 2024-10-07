// app/layout.jsx

import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import NavBarWrapper from '@/components/custom/nav-bar-wrapper';
import {Toaster} from "@/components/ui/toaster"; // Import the NavBarWrapper
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Parking Pass',
    description: 'Your solution to easy parking.',
};
//@ts-ignore
export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <Providers>
            {children}
            <NavBarWrapper /> {/* Include the NavBarWrapper */}
            <Toaster />
        </Providers>
        </body>
        </html>
    );
}
