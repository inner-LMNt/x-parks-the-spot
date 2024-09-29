"use client";

import { useState } from 'react';
import { Home, Search, Calendar, User, Plus } from 'lucide-react';
import { cn } from "@/lib/utils";

export function BottomNavBar() {
  const [activeIcon, setActiveIcon] = useState<string | null>(null);

  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: Search, label: 'Search' },
    { icon: Plus, label: 'Add', isCenter: true },
    { icon: Calendar, label: 'Bookings' },
    { icon: User, label: 'Profile' },
  ];

  return (
      <nav className="sticky bottom-0 left-0 right-0 bg-gray-100 shadow-lg z-10 border-t border-gray-300"> {/* Added z-10 to ensure it stays on top */}
        <div className="flex justify-around items-center h-16 px-4">
          {navItems.map((item) => (
              <button
                  key={item.label}
                  onClick={() => setActiveIcon(item.label)}
                  className={cn(
                      "flex flex-col items-center justify-center",
                      item.isCenter ? "relative -top-1" : "",
                      activeIcon === item.label ? "text-blue-500" : "text-gray-500"
                  )}
              >
                <div
                    className={cn(
                        "p-2 rounded-full",
                        item.isCenter ? "bg-blue-500 text-white shadow-lg" : "",
                        activeIcon === item.label && !item.isCenter ? "bg-blue-100" : ""
                    )}
                >
                  <item.icon size={item.isCenter ? 24 : 20} />
                </div>
                {!item.isCenter && (
                    <span className="text-xs mt-1">{item.label}</span>
                )}
              </button>
          ))}
        </div>
      </nav>
  );
}
