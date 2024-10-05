'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks'; // Adjust the path as necessary

export default function HomePage() {
  const router = useRouter();
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);

  useEffect(() => {
    // Define noauthPages within the component or import if defined elsewhere
    const noauthPages = ['/login', '/register', '/about', '/contact']; // Adjust as needed

    if (!isLoggedIn && !noauthPages.includes(router.pathname)) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null; // Or a loading spinner
  }

  return (
      <div>
      </div>
  );
}
