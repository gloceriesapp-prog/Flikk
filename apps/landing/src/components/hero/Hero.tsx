"use client";

import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";

const MOCKUP_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/Mockuuups%20Free%20iPhone%20Hand%20Mockup.png";

export default function Hero() {
  return (
    <section className="w-full bg-white">
      <div className="max-w-[1080px] mx-auto px-6">
        {/* Main Bordered Container — deep navy-to-blue gradient with soft
            aurora glows behind the phone, same "colored card looks premium"
            treatment as the promo cards below, scaled up for a first-look
            hero moment instead of their flat saturated fill. */}
        <div className="relative flex flex-col md:flex-row items-stretch justify-between w-full rounded-3xl overflow-hidden bg-[linear-gradient(135deg,#060B18_0%,#0B1743_38%,#123A8C_72%,#1E4DE8_100%)] ">
          {/* Aurora glow blobs — pure CSS, no image asset, kept subtle so
              the text on top never loses contrast. */}
          <div className="pointer-events-none absolute -top-24 -left-16 h-[420px] w-[420px] rounded-full bg-[#3B6BFF] opacity-30 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-32 right-[8%] h-[380px] w-[380px] rounded-full bg-[#A8D93A] opacity-[0.18] blur-[120px]" />
          <div className="pointer-events-none absolute top-1/3 right-1/4 h-[260px] w-[260px] rounded-full bg-[#7C4DFF] opacity-20 blur-[100px]" />
          {/* Faint diagonal hairline texture — the same "considered, not
              flat" premium-fintech cue Stripe/Linear hero sections use. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 64px)",
            }}
          />

          {/* Left Column: Text & Buttons */}
          <div className="relative z-10 flex flex-col justify-center gap-6 w-full md:w-[55%] p-8 md:px-12 md:py-10 lg:px-16 lg:py-12">
            {/* Text Headline */}
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/15 w-fit px-3 py-1 rounded-full mb-1">
                <HugeiconsIcon icon={SparklesIcon} className="w-3.5 h-3.5 text-[#A8D93A]" /> Your Everyday Shopping
              </span>
              <span className="text-3xl sm:text-4xl md:text-[40px] lg:text-[46px] font-bold text-white leading-[1.1] tracking-tight">
                Everything You Need.
                <br />
                <span className="bg-gradient-to-r from-white to-[#BFD4FF] bg-clip-text text-transparent">
                  From Stores You Love.
                </span>
              </span>
            </div>

            {/* Action Buttons: Google Play & App Store */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full mt-2">
              {/* Google Play Button */}
              <a
                href="#download-android"
                className="flex-1 md:flex-initial w-full sm:w-auto bg-white border border-white/0 text-[#0F172A] px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] hover:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
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
                className="flex-1 md:flex-initial w-full sm:w-auto bg-white border border-white/0 text-[#0F172A] px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] hover:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
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

          {/* Right Column: Image Container */}
          <div className="relative z-10 w-full md:w-[45%] pt-8 px-6 sm:px-10 pb-0 flex items-end justify-center overflow-hidden min-h-[280px]">
            {/* Soft glow puddle grounding the phone, like light bouncing off
                a glass display counter — the "premium product shot" cue. */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[140px] w-[260px] -translate-x-1/2 rounded-[50%] bg-white/25 blur-3xl" />
            <div className="relative z-10 flex items-end justify-center -mb-1 mt-auto">
              <Image
                src={MOCKUP_IMAGE_URL}
                alt="Flikk Hand Holding iPhone App Mockup"
                width={440}
                height={440}
                priority
                style={{ width: "100%", height: "auto" }}
                className="max-w-[320px] sm:max-w-[400px] object-contain align-bottom block"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}