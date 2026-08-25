"use client";

import React from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

const MOCKUP_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/Mockuuups%20Free%20iPhone%20Hand%20Mockup.png";

export default function Hero() {
  return (
    <section className="w-full bg-white pb-8">
      <div className="max-w-[980px] mx-auto px-6 flex flex-col items-center gap-8">
        {/* Top Hero Image in a Premium Gray Container - Flush at Bottom */}
        <div className="w-full bg-[#F3F4F6] pt-8 sm:pt-12 px-6 sm:px-10 pb-0 flex items-end justify-center relative overflow-hidden">
          <div className="relative z-10 flex items-end justify-center -mb-1">
            <Image
              src={MOCKUP_IMAGE_URL}
              alt="Instamart Hand Holding iPhone App Mockup"
              width={440}
              height={440}
              priority
              style={{ width: "100%", height: "auto" }}
              className="max-w-[360px] sm:max-w-[440px] object-contain align-bottom block"
            />
          </div>
        </div>

        {/* Bottom Headline & Download Buttons Row - Perfectly Aligned */}
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left Text Headline */}
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0052FF] bg-blue-50 w-fit px-2.5 py-0.5 rounded-full mb-1">
              <Sparkles className="w-3 h-3" /> Your Everyday Shopping
            </span>
            <span className="text-2xl sm:text-3xl md:text-[36px] font-semibold text-[#0F172A] leading-[1.18] tracking-tight">
              Everything You Need.
              <br />
              <span className="text-[#0F172A]">From Stores You Love.</span>
            </span>
          </div>

          {/* Right Action Buttons: Google Play & App Store */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            {/* Google Play Button */}
            <a
              href="#download-android"
              className="flex-1 md:flex-initial bg-white border border-gray-200 text-[#0F172A] px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform"
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
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[12px] font-medium tracking-tight opacity-70">
                  Get it on
                </span>
                <span className="text-sm sm:text-base font-semibold tracking-tight -mt-0.5">
                  Google Play
                </span>
              </div>
            </a>

            {/* App Store Button */}
            <a
              href="#download-ios"
              className="flex-1 md:flex-initial bg-white border border-gray-200 text-[#0F172A] px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-current shrink-0 group-hover:scale-105 transition-transform"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
              </svg>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-medium tracking-tight opacity-70">
                  Download on the
                </span>
                <span className="text-sm sm:text-base font-bold tracking-tight -mt-0.5">
                  App Store
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
