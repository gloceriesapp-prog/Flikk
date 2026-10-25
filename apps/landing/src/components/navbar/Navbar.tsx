"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/seo/config";
import LocationModal from "../location/LocationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  ArrowDown01Icon,
  AutoConversationsIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import AnnouncementBanner from "./AnnouncementBanner";

import { checkServiceability } from "@/lib/serviceability";

// Availability is answered by the backend (GET /stores/serviceability), the
// same source the customer app's own gate uses — not a hardcoded keyword list.
// A location is "Available" iff a real store covers its coords within that
// store's delivery radius. Coords come from LocationModal (GPS detect, or
// Nominatim-geocoded typed location).

const SEARCH_PLACEHOLDERS = [
  'Search for "Ice Cream"',
  'Search for "Fresh Milk"',
  'Search for "Atta & Dal"',
  'Search for "Chips & Snacks"',
  'Search for "Cold Drinks"',
];

// ponytail: picker only remembers the choice — no translations exist yet; wire next-intl (or similar) when Kannada/Hindi copy is ready.
const LANGUAGES = [
  { code: "en", short: "EN", label: "English" },
  { code: "kn", short: "ಕ", label: "ಕನ್ನಡ" },
  { code: "hi", short: "हि", label: "हिन्दी" },
] as const;

const POPULAR_SEARCHES = [
  { term: "Ice Cream Tubs", category: "Desserts" },
  { term: "Organic Milk", category: "Dairy" },
  { term: "Fresh Bananas", category: "Fruits" },
  { term: "Dark Chocolate", category: "Snacks" },
  { term: "Farm Fresh Eggs", category: "Breakfast" },
  { term: "Cold Drinks", category: "Beverages" },
];

// Custom stroke icons (user-supplied); currentColor so they follow the text colour.
function MotorIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9.68661 16.6078C9.69561 16.6618 9.69561 16.7158 9.69561 16.7698C9.69561 18.1647 8.56166 19.2807 7.18472 19.2807C5.78978 19.2807 4.67383 18.1557 4.67383 16.7698C4.67383 16.7158 4.67383 16.6618 4.68283 16.6078" />
      <path d="M19.8298 10.0922C18.9209 10.2992 17.7779 9.83118 17.5619 8.91322C17.3549 8.00426 18.1649 7.0053 19.0739 6.79831C20.0278 7.73427 20.2798 8.83222 19.8298 10.0922Z" />
      <path d="M18.1191 14.2948C19.3251 14.4748 20.261 15.5188 20.261 16.7787C20.261 18.1737 19.1271 19.2896 17.7501 19.2896C16.3552 19.2896 15.2393 18.1647 15.2393 16.7787" />
      <path d="M12.6566 4.71033H14.7895C15.2125 4.71033 15.6895 5.03431 15.8514 5.4213L18.8393 12.729C19.0013 13.134 18.9023 13.6019 18.5783 13.8899L15.8604 16.3378C15.6715 16.5088 15.4195 16.6078 15.1675 16.6078H3V14.1059C3 12.315 4.44894 10.8571 6.24886 10.8571H8.08478C8.89475 10.8571 9.63272 11.316 9.9927 12.045L10.6497 13.377C10.9197 13.9169 11.4686 14.2589 12.0626 14.2589H13.0256C13.6735 14.2589 14.2045 13.7549 14.2495 13.107L14.1865 8.73315C14.1775 7.94119 14.8075 7.29322 15.5995 7.29322H16.6074" />
      <path d="M19.0918 12.846C19.0918 12.846 20.3517 12.981 20.9997 13.953" />
      <path d="M17.7512 16.7879L16.6982 15.5729" />
      <path d="M5.33984 8.08517H8.14772" />
    </svg>
  );
}

function PhoneIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18.3748 6.61751L18.3758 17.3815C18.3758 19.38 16.7558 21 14.7573 21H9.24251C7.245 21 5.625 19.38 5.625 17.3825L5.62402 6.61849C5.62402 4.62 7.24402 3 9.24154 3H14.7573C16.7548 3 18.3748 4.62 18.3748 6.61751Z" />
      <path d="M5.63477 14.8623H18.3671" />
      <path d="M12.0002 17.981V17.9328M12.0002 17.6797C11.862 17.6797 11.75 17.7917 11.75 17.9295C11.75 18.0677 11.862 18.1797 12.0002 18.1797C12.1385 18.1797 12.2505 18.0677 12.2505 17.9295C12.2505 17.7917 12.1385 17.6797 12.0002 17.6797Z" />
    </svg>
  );
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M11.2485 3.50024C7.22315 3.50024 3.95996 6.76343 3.95996 10.7888C3.95996 14.8141 7.22315 18.0773 11.2485 18.0773C15.2738 18.0773 18.537 14.8141 18.537 10.7888C18.537 6.76343 15.2738 3.50024 11.2485 3.50024ZM2.45996 10.7888C2.45996 5.93501 6.39472 2.00024 11.2485 2.00024C16.1023 2.00024 20.037 5.93501 20.037 10.7888C20.037 15.6426 16.1023 19.5773 11.2485 19.5773C6.39472 19.5773 2.45996 15.6426 2.45996 10.7888Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M16.7359 15.6477L22.3514 21.2486L21.2921 22.3106L15.6766 16.7097L16.7359 15.6477Z" />
    </svg>
  );
}

// Round India flag — inline SVG so it renders on Windows too (flag emoji don't).
function IndiaFlag() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10" aria-hidden="true">
      <clipPath id="in-flag"><circle cx="12" cy="12" r="12" /></clipPath>
      <g clipPath="url(#in-flag)">
        <rect width="24" height="8" fill="#FF9933" />
        <rect y="8" width="24" height="8" fill="#FFFFFF" />
        <rect y="16" width="24" height="8" fill="#138808" />
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="#000080" strokeWidth="0.8" />
        <circle cx="12" cy="12" r="0.6" fill="#000080" />
      </g>
    </svg>
  );
}

// promptLocation=false skips the first-visit location modal — used on pages
// a visitor must be able to read straight away (legal/policy pages).
export default function Navbar({ promptLocation = true }: { promptLocation?: boolean } = {}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // User Location State & First-Load Prompt Modal State
  const [userLocation, setUserLocation] = useState<string>("Kodialbail, Mangalore");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  // null = not yet resolved (hide badge); true/false = real backend answer.
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);

  const [lang, setLang] = useState<(typeof LANGUAGES)[number]>(LANGUAGES[0]);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // First-load location detection & instant restoration on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLoc = localStorage.getItem("gloceries_user_location");
      if (savedLoc && savedLoc.trim() !== "") {
        // Hydrating client-only persisted state from localStorage (unavailable
        // during SSR) — a legitimate external-system sync, not a render cascade.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserLocation(savedLoc);
        setIsLocationModalOpen(false);
        setIsFirstVisit(false);
        // Re-check serviceability from persisted coords so the badge is right
        // on refresh, not just right after picking a location.
        const savedCoords = localStorage.getItem("gloceries_user_coords");
        if (savedCoords) {
          try {
            const { lat, lng } = JSON.parse(savedCoords);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              checkServiceability(lat, lng).then((r) => {
                if (r) setIsServiceable(r.serviceable);
              });
            }
          } catch {
            /* corrupt coords — leave badge unresolved */
          }
        }
      } else if (promptLocation) {
        setIsFirstVisit(true);
        const timeout = setTimeout(() => {
          setIsLocationModalOpen(true);
        }, 300);
        return () => clearTimeout(timeout);
      }
    }
  }, [promptLocation]);

  const handleSelectLocation = (
    newLoc: string,
    coords?: { lat: number; lng: number },
  ) => {
    setUserLocation(newLoc);
    setIsFirstVisit(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("gloceries_user_location", newLoc);
    }
    if (coords) {
      if (typeof window !== "undefined") {
        localStorage.setItem("gloceries_user_coords", JSON.stringify(coords));
      }
      setIsServiceable(null);
      checkServiceability(coords.lat, coords.lng).then((r) => {
        if (r) setIsServiceable(r.serviceable);
      });
    } else {
      // No coords (geocode failed / fallback) — can't verify, so don't assert.
      if (typeof window !== "undefined") {
        localStorage.removeItem("gloceries_user_coords");
      }
      setIsServiceable(null);
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
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full sticky top-0 z-50">
      <AnnouncementBanner />

      {/* Below xl the row wraps: brand + location on top, search + app CTA
          beneath, so nothing overflows a phone-width viewport. */}
      <div className="bg-[#F2F4F4]/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 sm:gap-4 xl:gap-6">
        {/* Left Brand Logo & Location Pill */}
        <div className="flex items-center gap-3 w-full xl:w-auto xl:shrink-0 min-w-0">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 cursor-pointer select-none group"
            aria-label="Gloceries Home"
          >
            <Image
              src={SITE.logoPath}
              alt="Gloceries"
              width={52}
              height={52}
              sizes="52px"
              priority
              className="h-10 w-10 rounded-xl object-contain sm:h-11 sm:w-11"
            />
            <span className="hidden text-[22px] font-bold tracking-tight text-[#101C10] sm:inline">Gloceries</span>
          </Link>

          <div className="hidden h-8 w-px bg-slate-200 md:block" />

          {/* Delivery location — two 16px lines like the reference, opens LocationModal. */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            aria-label="Change delivery location"
            className="group flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-white"
          >
            <MotorIcon className="h-7 w-7 shrink-0 text-[#101C10]" />
            <span className="flex min-w-0 flex-col leading-snug">
              <span className="max-w-[260px] truncate text-[16px] font-semibold text-[#101C10]">Deliver to: {userLocation}</span>
              <span className="flex items-center gap-2 text-[16px] font-semibold text-[#155DFC]">
                Change address
                {isServiceable === true && (
                  <span className="rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Available</span>
                )}
                {isServiceable === false && (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Coming soon</span>
                )}
              </span>
            </span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4 shrink-0 -rotate-90 text-slate-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Center Search Bar with Interactive Dropdown */}
        <div className="flex-1 min-w-0 relative" ref={searchRef}>
          <div
            className={`flex items-center overflow-hidden rounded-2xl border bg-white pl-4 sm:pl-5 h-12 md:h-[52px] transition-all ${isSearchFocused
              ? "border-[#155DFC] ring-4 ring-[#155DFC]/15 shadow-md"
              : "border-slate-200 hover:border-slate-300"
              }`}
          >
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
              aria-label="Search products"
              className="w-full min-w-0 bg-transparent outline-none text-[16px] md:text-[18px] font-normal text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setIsSearchFocused(true)}
              aria-label="Search"
              className="flex h-full w-14 shrink-0 items-center justify-center bg-[#155DFC] text-white transition-colors hover:bg-[#0F4BD8] md:w-20"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Trending Searches Floating Dropdown */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200/80 ring-1 ring-black/5 z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-[15px] font-medium text-black/60 tracking-tight flex items-center gap-1.5">
                  <HugeiconsIcon icon={AutoConversationsIcon} className="w-3.5 h-3.5" /> Popular Searches
                </span>
              </div>

              <div className="flex flex-col gap-1 pb-3">
                {POPULAR_SEARCHES.map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      setIsDropdownOpen(true);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer group w-full"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0052FF] transition-colors shrink-0" />
                      <span className="text-[12px] sm:text-[15px] tracking-tight font-medium text-slate-800 group-hover:text-[#0052FF] transition-colors whitespace-nowrap truncate">
                        {item.term}
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-[12px] font-medium text-slate-400 bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#0052FF] px-2 py-0.5 rounded-md transition-colors shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))}
              </div>

              {/* Order via App Banner inside Dropdown */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      Download Gloceries for everyday essentials <br /> delivered to your door.
                    </span>
                    {/* <span className="text-[10px] font-medium text-slate-600">
                      Live tracking & fast doorstep delivery
                    </span> */}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    setIsDropdownOpen(true);
                  }}
                  className="bg-[#0052FF] hover:bg-[#0040E0] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                >
                  Get App
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language picker — flag + chevron, left of the app CTA. */}
        <div className="relative hidden shrink-0 sm:block" ref={langRef}>
          <button
            type="button"
            onClick={() => setIsLangOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={isLangOpen}
            aria-label={`Language: ${lang.label}`}
            className="flex h-12 items-center gap-2 rounded-full px-2.5 text-[16px] font-semibold text-[#101C10] transition-colors hover:bg-white md:h-[52px]"
          >
            <IndiaFlag />
            <span className="hidden lg:inline">{lang.short}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} className={`h-4 w-4 text-slate-600 transition-transform ${isLangOpen ? "rotate-180" : ""}`} />
          </button>
          {isLangOpen && (
            <ul role="listbox" aria-label="Choose language" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl ring-1 ring-black/5">
              {LANGUAGES.map((l) => (
                <li key={l.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={l.code === lang.code}
                    onClick={() => { setLang(l); setIsLangOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[16px] font-medium transition-colors hover:bg-slate-50 ${l.code === lang.code ? "text-[#155DFC]" : "text-[#101C10]"}`}
                  >
                    {l.label}
                    {l.code === lang.code && <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Right CTA Button: 🛒 Order on Gloceries App */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            className="flex h-12 md:h-[52px] items-center gap-2 rounded-xl bg-[#155DFC] px-4 sm:px-6 text-[15px] md:text-[18px] font-semibold text-white transition-all hover:bg-[#0F4BD8] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <PhoneIcon className="h-5 w-5 shrink-0 text-white" />
            <span className="hidden lg:inline">Get the App </span>
            <span className="lg:hidden">Get App</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`w-3.5 h-3.5 text-white/80 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {/* App Order & Download Dropdown Menu — scan-to-install QR */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl bg-white p-4 shadow-2xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="flex flex-col items-center text-center gap-3">
                <span className="text-sm font-medium text-slate-900 leading-tight">
                  Scan to get the Groceries app, available on Android & iOS.
                </span>

                {/* QR — scanning with phone camera opens the app store listing */}
                <div className="w-full rounded-2xl border border-gray-100 p-2 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://i.pinimg.com/736x/05/43/e7/0543e7cb27b3ba4045b94e3ca0d55e0e.jpg"
                    alt="Scan this QR code with your phone camera to download the Gloceries app"
                    className="w-full aspect-square object-cover rounded-xl select-none"
                    draggable={false}
                  />
                </div>

                <span className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                  {/* <HugeiconsIcon icon={QrCodeIcon} className="w-3.5 h-3.5 text-[#0052FF]" /> */}
                  Get it on Android & iOS
                </span>
              </div>
            </div>
          )}
        </div>

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