'use client';

import { useEffect } from 'react';
import { useRouter, usePathname} from 'next/navigation'; // Correct for App Router
import { useAppSelector } from '@/store/hooks'; // Adjust the path as necessary

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const noauthPages = ['/login', '/register', '/about', '/contact'];

  useEffect(() => {
    // Check if the current path is not in noauthPages and user is not logged in
    if (!isLoggedIn && !noauthPages.includes(pathname)) {
      router.push('/login');
    }
    else if(pathname === '/' && isLoggedIn){
        router.push('/profile');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null; // Or a loading spinner
  }

  return (
      <div>
        {/* Your protected content goes here */}
        <h1>Welcome to the Home Page</h1>
      </div>
  );
}
