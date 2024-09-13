import React from "react";
import { MapPin } from "lucide-react";

export const Logo = () => (
    <div className="absolute top-4 left-4 font-bold text-4xl">
        <div className="relative inline-block">
      <span className="relative bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200 text-transparent bg-clip-text">
        x parks the spot
      </span>
            <div className="absolute top-0 -right-12">
                <MapPin className="text-emerald-500" size={36} strokeWidth={2.5} />
            </div>
            <svg width="348" height="80" viewBox="0 0 348 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute -bottom-16 -left-1 pointer-events-none">
                <path d="M20 10 C 80 40, 160 0, 240 30 S 300 10, 320 10" stroke="url(#gradient)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#E9D5FF" />
                        <stop offset="50%" stopColor="#FBCFE8" />
                        <stop offset="100%" stopColor="#FFE4B5" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    </div>
);

export default Logo;