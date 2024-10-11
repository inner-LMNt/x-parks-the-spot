"use client";

import { useState } from 'react';
import {Search, Calendar, User, Plus, Car, Home} from 'lucide-react';
import { cn } from "@/lib/utils";
import Link from "next/link";

export function BottomNavBar() {
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  const navItems = [
    { icon: Car, label: 'My Spots', href: '/myspots', isCenter: false },
    { icon: Search, label: 'Search', href: '/search', isCenter: false },
    { icon: Plus, label: 'Add', href: '/add', isCenter: true },
    { icon: Calendar, label: 'Bookings', href: '/bookings', isCenter: false },
    { icon: User, label: 'Profile', href: '/profile', isCenter: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-100 shadow-lg z-10 border-t border-gray-300">
      <div className="flex justify-between items-center h-16 px-4">
        <div className="flex justify-around" style={{ width: '40%' }}>
          <Link href="/home" passHref>
            <button
              onClick={() => setActiveIcon('Home')}
              className={cn(
                "flex flex-col items-center justify-center",
                activeIcon === 'Home' ? "text-blue-500" : "text-gray-500"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full",
                  activeIcon === 'Home' ? "bg-blue-100" : ""
                )}
              >
                <Home size={20} />
              </div>
              <span className="text-xs mt-1">Home</span>
            </button>
          </Link>
          <Link href="/search" passHref>
            <button
              onClick={() => setActiveIcon('Search')}
              className={cn(
                "flex flex-col items-center justify-center",
                activeIcon === 'Search' ? "text-blue-500" : "text-gray-500"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full",
                  activeIcon === 'Search' ? "bg-blue-100" : ""
                )}
              >
                <Search size={20} />
              </div>
              <span className="text-xs mt-1">Search</span>
            </button>
          </Link>
        </div>
        <div className="flex justify-center" style={{ width: '20%' }}>
          <Link href="/add" passHref>
            <button
              onClick={() => setActiveIcon('Add')}
              className={cn(
                "flex flex-col items-center justify-center",
                activeIcon === 'Add' ? "text-blue-500" : "text-gray-500"
              )}
            >
              <div className="p-2 rounded-full bg-blue-500 text-white shadow-lg">
                <Plus size={30} />
              </div>
            </button>
          </Link>
        </div>
        <div className="flex justify-around" style={{ width: '40%' }}>
          <Link href="/bookings" passHref>
            <button
              onClick={() => setActiveIcon('Bookings')}
              className={cn(
                "flex flex-col items-center justify-center",
                activeIcon === 'Bookings' ? "text-blue-500" : "text-gray-500"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full",
                  activeIcon === 'Bookings' ? "bg-blue-100" : ""
                )}
              >
                <Calendar size={20} />
              </div>
              <span className="text-xs mt-1">Bookings</span>
            </button>
          </Link>
          <Link href="/profile" passHref>
            <button
              onClick={() => setActiveIcon('Profile')}
              className={cn(
                "flex flex-col items-center justify-center",
                activeIcon === 'Profile' ? "text-blue-500" : "text-gray-500"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full",
                  activeIcon === 'Profile' ? "bg-blue-100" : ""
                )}
              >
                <User size={20} />
              </div>
              <span className="text-xs mt-1">Profile</span>
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}