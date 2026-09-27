"use client";

import React from "react";

export default function AnnouncementBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-[#0052FF] via-[#1D4ED8] to-[#4F46E5] text-white py-2 px-4 shadow-sm relative z-50">
      <div className="max-w-[980px] mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-center tracking-tight">
        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold  tracking-wider text-amber-300 shrink-0">
          🎉 We&apos;re Live
        </span>
        {/* Gloceries is now delivering everyday groceries in Mangalore! */}
        <span>Gloceries is now delivering groceries across every corner of Mangalore.</span>
        <span className="hidden md:inline-block text-white/80 font-normal">
          •
        </span>
        <span className="hidden md:inline-block font-bold text-blue-100 bg-white/10 px-2.5 py-0.5 rounded-full text-xs shrink-0">
          Free delivery on your first order
        </span>
      </div>
    </div>
  );
}
