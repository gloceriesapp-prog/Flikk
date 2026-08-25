"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown, MapPin, Heart } from "lucide-react";

const LOGO_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/All_Right-removebg-preview.png";

const CATEGORIES_LIST = [
  "Fresh Vegetables",
  "Fresh Fruits",
  "Dairy, Bread and Eggs",
  "Meat and Seafood",
  "Atta, Rice and Dal",
  "Masalas & Spices",
  "Oils and Ghee",
  "Cereals and Breakfast",
];

const CITIES_LIST = [
  "Mangalore",
  "Bangalore",
  "Delhi",
  "Jaipur",
  "Kochi",
  "Mumbai",
  "Noida",
  "Pune",
];

export default function Footer() {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  return (
    <footer className="w-full bg-white pt-0 pb-0">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Dark Footer Card Constrained Strictly Inside max-w-[980px] */}
        <div className="w-full bg-[#000] text-white pt-12 pb-10 px-8 sm:px-10 relative overflow-hidden flex flex-col gap-8">
          {/* Top Subtle Neon Gradient Border */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0052FF] to-transparent opacity-80" />

          {/* Decorative Glow Spots */}
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#0052FF]/10 rounded-full blur-3xl pointer-events-none -ml-40" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-40" />

          {/* Brand Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60 relative z-10">
            <a href="#" className="flex items-center gap-3 group">
              <Image
                src={LOGO_IMAGE_URL}
                alt="Flikk Logo"
                width={48}
                height={48}
                style={{ width: "auto", height: "42px" }}
                className="object-contain group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col leading-[0.95]">
                <span className="text-[22px] font-black text-[#EAB308] tracking-tight">
                  Flikk
                </span>
                <span className="text-[22px] font-black text-[#0052FF] tracking-tight">
                  Now in Mangalore
                </span>
              </div>
            </a>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Delivering across 27+ Cities in India</span>
            </div>
          </div>

          {/* 5-Column Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-sm relative z-10">
            {/* Column 1: Categories */}
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-extrabold text-white tracking-tight">
                Categories
              </h4>
              <ul className="flex flex-col gap-2.5 text-slate-400 font-medium text-xs">
                {CATEGORIES_LIST.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: We deliver to */}
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-extrabold text-white tracking-tight">
                We deliver to
              </h4>
              <ul className="flex flex-col gap-2.5 text-slate-400 font-medium text-xs">
                {CITIES_LIST.map((city) => (
                  <li key={city}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                    >
                      {city}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Company */}
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-extrabold text-white tracking-tight">
                Company
              </h4>
              <ul className="flex flex-col gap-2.5 text-slate-400 font-medium text-xs">
                {["About Flikk", "Careers", "Team", "Flikk One", "Press & News"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-extrabold text-white tracking-tight">
                Legal
              </h4>
              <ul className="flex flex-col gap-2.5 text-slate-400 font-medium text-xs">
                {[
                  "Terms & Conditions",
                  "Cookie Policy",
                  "Privacy Policy",
                  "Security & Trust",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Contact us */}
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-extrabold text-white tracking-tight">
                Contact us
              </h4>
              <ul className="flex flex-col gap-2.5 text-slate-400 font-medium text-xs">
                {["Help & Support", "Partner with us", "Ride with us", "Store Owner Portal"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          {/* Action Row: Dropdown Buttons on Left & Real Color Social Icons on Right End */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 pt-2">
            {/* Left Buttons: Categories & Cities */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer"
              >
                <span>35 Categories</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showAllCategories ? "rotate-180" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowAllCities((prev) => !prev)}
                className="border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer"
              >
                <span>27 Cities</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showAllCities ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Right End: Real Color Social Brand Icons */}
            <div className="flex items-center gap-3">
              {/* Facebook - #1877F2 */}
              <a
                href="#"
                aria-label="Facebook"
                className="w-9 h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.64 13.72 5.64c1.07 0 2.18.19 2.18.19v2.4h-1.23c-1.23 0-1.62.77-1.62 1.56V12h2.7l-.43 3h-2.27v6.8c4.56-.93 8-4.96 8-9.8z" />
                </svg>
              </a>

              {/* Pinterest - #E60023 */}
              <a
                href="#"
                aria-label="Pinterest"
                className="w-9 h-9 rounded-xl bg-[#E60023] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.15 2.53 7.71 6.12 9.24-.09-.79-.17-2 .03-2.86.19-.79 1.2-5.11 1.2-5.11s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.89 0 1.32.67 1.32 1.47 0 .89-.57 2.23-.86 3.47-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.27-1.95 3.27-4.77 0-2.49-1.79-4.23-4.34-4.23-2.96 0-4.7 2.22-4.7 4.52 0 .89.34 1.85.77 2.37.08.1.1.19.07.31-.08.31-.25 1.04-.28 1.18-.04.19-.15.23-.35.14-1.31-.61-2.13-2.52-2.13-4.06 0-3.3 2.4-6.34 6.93-6.34 3.64 0 6.47 2.59 6.47 6.06 0 3.61-2.28 6.52-5.44 6.52-1.06 0-2.06-.55-2.4-1.2l-.65 2.48c-.24.91-.88 2.05-1.31 2.74C9.9 21.84 10.93 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              </a>

              {/* Instagram - Authentic Gradient */}
              <a
                href="#"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#405DE6] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>

              {/* Twitter - #1DA1F2 */}
              <a
                href="#"
                aria-label="Twitter"
                className="w-9 h-9 rounded-xl bg-[#1DA1F2] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
                </svg>
              </a>

              {/* LinkedIn - #0A66C2 */}
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom Bar: Copyright on Left, Origin Badge on Right End */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400 relative z-10">
            <span>© 2026 Flikk Technologies Pvt. Ltd. All rights reserved.</span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              Made in Udupi<Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" /> India&apos;s Silicon Coast
            </span>
          </div>

          {/* Regional Heritage Sentence & Legal Disclaimer */}
          <div className="pt-5 border-t border-slate-800/60 flex flex-col gap-2 text-[11px] font-medium text-slate-500 leading-relaxed relative z-10">
            <p>
              “Flikk” is owned & managed by &quot;Flikk Commerce Private Limited&quot; and is not related, linked or interconnected in whatsoever manner or nature, to “GROFFR.COM” which is a real estate services business operated by “Redstone Consultancy Services Private Limited”.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
