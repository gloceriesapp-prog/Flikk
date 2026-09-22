"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import AnnouncementBanner from "./AnnouncementBanner";
import LocationModal from "../location/LocationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  ArrowDown01Icon,
  ShoppingBag01Icon,
  LinkSquare02Icon,
  QrCodeIcon,
  SparklesIcon,
  Location01Icon,
  FireIcon,
  FlashIcon,
  Cancel01Icon,
  FavouriteIcon,
} from "@hugeicons/core-free-icons";

const LOGO_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/All_Right-removebg-preview.png";

// Real launch area this landing page already commits to elsewhere
// (AnnouncementBanner's own "Fast Local Delivery in Mangalore", and 7 of
// LocationModal's own 8 suggested addresses) — not a guess invented for
// this badge. "Manipal, Udupi" (the modal's one non-Mangalore suggestion)
// deliberately stays "Coming Soon": it's listed as a heads-up for what's
// next, not a place real delivery already runs.
const SERVICEABLE_AREA_KEYWORDS = ["mangalore"];

function isLocationServiceable(location: string): boolean {
  const needle = location.toLowerCase();
  return SERVICEABLE_AREA_KEYWORDS.some((area) => needle.includes(area));
}

const SEARCH_PLACEHOLDERS = [
  'Search for "Ice Cream"',
  'Search for "Fresh Milk"',
  'Search for "Atta & Dal"',
  'Search for "Chips & Snacks"',
  'Search for "Cold Drinks"',
];

const POPULAR_SEARCHES = [
  { term: "Ice Cream Tubs", category: "Desserts" },
  { term: "Organic Milk", category: "Dairy" },
  { term: "Fresh Bananas", category: "Fruits" },
  { term: "Dark Chocolate", category: "Snacks" },
  { term: "Farm Fresh Eggs", category: "Breakfast" },
  { term: "Cold Drinks", category: "Beverages" },
];

export default function Navbar() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState<string | null>(null);

  // User Location State & First-Load Prompt Modal State
  const [userLocation, setUserLocation] = useState<string>("Kodialbail, Mangalore");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // First-load location detection & instant restoration on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLoc = localStorage.getItem("flikk_user_location");
      if (savedLoc && savedLoc.trim() !== "") {
        setUserLocation(savedLoc);
        setIsLocationModalOpen(false);
        setIsFirstVisit(false);
      } else {
        setIsFirstVisit(true);
        const timeout = setTimeout(() => {
          setIsLocationModalOpen(true);
        }, 300);
        return () => clearTimeout(timeout);
      }
    }
  }, []);

  const handleSelectLocation = (newLoc: string) => {
    setUserLocation(newLoc);
    setIsFirstVisit(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("flikk_user_location", newLoc);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-50">
      {/* Top Announcement Banner */}
      <AnnouncementBanner />

      {/* Increased max-width to 1280px to align with the rest of the page layout */}
      <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-4 sm:gap-6 bg-white">
        {/* Left Brand Logo & Location Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            className="flex items-center gap-2 cursor-pointer select-none group"
            aria-label="Flikk Home"
          >
            <div className="flex flex-col leading-[0.95]">
              <span className="text-[30px] sm:text-[34px] font-black text-[#000000] tracking-tight">
                gloceries <span className="text-[#155dfc] h-2 w-2 rounded-full inline-block bg-[#155dfc]"></span>
              </span>
            </div>
          </a>

          <div className="hidden md:block w-px h-7 bg-slate-200" />

          {/* Location Badge Pill */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            aria-label="Change delivery location"
            className="flex items-center gap-1.5 px-3 cursor-pointer transition-colors text-left group"
          >
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-2">
                <span className="text-[20px] font-semibold text-black tracking-tight">
                  Your location
                </span>
                {isLocationServiceable(userLocation) ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    Available
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </span>
              <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1 group-hover:text-[#0052FF] transition-colors">
                {userLocation}
                <HugeiconsIcon icon={ArrowDown01Icon} className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0052FF] transition-colors" />
              </span>
            </div>
          </button>
        </div>

        {/* Center Search Bar with Interactive Dropdown */}
        <div className="flex-1 max-w-[460px] relative" ref={searchRef}>
          <div
            className={`flex items-center bg-[#F1F3F6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0052FF]/20 focus-within:border-[#0052FF] border rounded-xl px-5 h-[54px] transition-all ${
              isSearchFocused
                ? "border-[#0052FF] bg-white ring-2 ring-[#0052FF]/20 shadow-md"
                : "border-transparent"
            }`}
          >
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
              className="w-full bg-transparent outline-none text-base font-medium text-slate-800 placeholder:text-slate-400"
            />
            <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-slate-500 shrink-0 cursor-pointer" />
          </div>

          {/* Trending Searches Floating Dropdown */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200/80 ring-1 ring-black/5 z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon icon={FireIcon} className="w-3.5 h-3.5 text-amber-500" /> Popular Searches
                </span>
                <span className="text-[10px] font-bold text-[#0052FF] bg-blue-50 px-2 py-0.5 rounded-full">
                  Fast Local Delivery
                </span>
              </div>

              <div className="flex flex-col gap-1 pb-3">
                {POPULAR_SEARCHES.map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    onClick={() => {
                      setModalSearchTerm(item.term);
                      setIsSearchFocused(false);
                      setIsDropdownOpen(true);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer group w-full"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0052FF] transition-colors shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#0052FF] transition-colors whitespace-nowrap truncate">
                        {item.term}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#0052FF] px-2 py-0.5 rounded-md transition-colors shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>

              {/* Order via App Banner inside Dropdown */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={FlashIcon} className="w-4 h-4 text-[#0052FF] shrink-0 fill-current" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-900 leading-tight">
                      Order on Flikk App
                    </span>
                    <span className="text-[10px] font-medium text-slate-600">
                      Live tracking & fast doorstep delivery
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    setIsDropdownOpen(true);
                  }}
                  className="bg-[#0052FF] hover:bg-[#0040E0] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                >
                  Get App
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right CTA Button: 🛒 Order on Flikk App */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0052FF] to-[#0040E0] hover:from-[#0048E5] hover:to-[#0036C7] active:scale-[0.98] text-white px-5 sm:px-6 py-3.5 rounded-xl font-extrabold text-sm sm:text-base shadow-md hover:shadow-lg transition-all cursor-pointer group shrink-0"
          >
            <HugeiconsIcon icon={ShoppingBag01Icon} className="w-5 h-5 text-white shrink-0 group-hover:scale-110 transition-transform" />
            <span className="hidden xs:inline">Order on Flikk App</span>
            <span className="xs:hidden">Get App</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* App Order & Download Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-80 rounded-2xl bg-white p-4 shadow-2xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-slate-900">
                    {modalSearchTerm
                      ? `Order "${modalSearchTerm}"`
                      : "Order on Flikk Mobile App"}
                  </span>
                  <span className="text-[10px] font-semibold text-[#0052FF]">
                    ⚡ Fast Local Delivery in Mangalore
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                </button>
              </div>

              {/* App Download Links */}
              <div className="flex flex-col gap-2 pt-3">
                {/* iOS App Store Option */}
                <a
                  href="#download-ios"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide leading-none">
                        iPhone App
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 mt-0.5 group-hover:text-[#0052FF] transition-colors">
                        Download on App Store
                      </span>
                    </div>
                  </div>
                  <HugeiconsIcon icon={LinkSquare02Icon} className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0052FF] group-hover:translate-x-0.5 transition-all" />
                </a>

                {/* Android Google Play Option */}
                <a
                  href="#download-android"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill="#4285F4"
                          d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z"
                        />
                        <path
                          fill="#34A853"
                          d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z"
                        />
                        <path
                          fill="#FBBC04"
                          d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z"
                        />
                        <path
                          fill="#EA4335"
                          d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide leading-none">
                        Android App
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 mt-0.5 group-hover:text-[#0052FF] transition-colors">
                        GET IT ON Google Play
                      </span>
                    </div>
                  </div>
                  <HugeiconsIcon icon={LinkSquare02Icon} className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0052FF] group-hover:translate-x-0.5 transition-all" />
                </a>
              </div>

              {/* QR Code Banner Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium flex items-center gap-1.5 text-slate-600">
                  <HugeiconsIcon icon={QrCodeIcon} className="w-3.5 h-3.5 text-[#0052FF]" /> Scan QR with camera to open app
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  v2.4
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Interactive Location Selection Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleSelectLocation}
        currentLocation={userLocation}
        isFirstVisit={isFirstVisit}
      />
    </header>
  );
}