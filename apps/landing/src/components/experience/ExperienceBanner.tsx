import React from "react";
import Image from "next/image";

// Two-card promo band above the hero.
// Left: headline + app download buttons. Right: full-bleed image with text overlaid.

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#0052FF" />
    <path
      d="M8 12.5l2.5 2.5L16 9.5"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FEATURES = ["No extra fees", "Verified shops", "Same store prices"];

export default function ExperienceBanner() {
  return (
    <section className="w-full bg-white pt-4 pb-2">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch">
          {/* LEFT — headline + download buttons */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-center gap-5">

            {/* full-bleed background image */}
            <Image
              src="https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/card1-landing.png"
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              priority={false}
              className="pointer-events-none select-none object-cover z-0"
            />

            {/* Legibility stack: even deep-green veil guarantees min contrast everywhere,
                then a stronger left-to-right ramp anchors the text column. */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-[#052B1F]/45" />
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[#052B1F]/90 via-[#0A402B]/60 to-transparent" />

            <span className="relative z-10 inline-flex items-center gap-1.5 w-fit text-[12px] font-medium text-[#FFFFFF] bg-white/20 backdrop-blur-sm ring-1 ring-[#2E7D32]/15 px-3 py-1 rounded-full">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              Now live in Kaup &amp; Udupi
            </span>

            <span className="relative z-10 text-2xl sm:text-3xl lg:text-[36px] font-semibold leading-[1.1] tracking-tight text-[#FFFFFF] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
              All your local favorites <br /> at your door in 30min
            </span>



            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full">
              <a
                href="#download-android"
                className="w-full sm:w-auto bg-white text-[#0F172A] px-5 py-2.5 rounded-2xl  flex items-center justify-center gap-2.5 group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z" />
                  <path fill="#34A853" d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z" />
                  <path fill="#FBBC04" d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z" />
                  <path fill="#EA4335" d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium tracking-tight opacity-70">Get it on</span>
                  <span className="text-[15px] font-medium tracking-tight -mt-0.5">Google Play</span>
                </div>
              </a>

              <a
                href="#download-ios"
                className="w-full sm:w-auto bg-white text-[#0F172A] px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2.5 group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium tracking-tight opacity-70">Download on the</span>
                  <span className="text-[15px] font-medium tracking-tight -mt-0.5">App Store</span>
                </div>
              </a>
            </div>
          </div>

          {/* RIGHT — full-bleed image with text overlaid */}
          <div className="relative overflow-hidden rounded-3xl min-h-[220px] sm:min-h-[280px] p-6 sm:p-8 flex flex-col justify-center gap-5">
            <Image
              src="https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/card2-image.png"
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              className="pointer-events-none select-none object-cover z-0"
            />

            <span className="relative z-10 text-3xl sm:text-4xl lg:text-[38px] font-semibold leading-[1.1] tracking-tight text-[#000000]">
              Direct from stores <br /> near you
            </span>

            <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-white/70 backdrop-blur-sm ring-1 ring-white/80 px-4 py-5 flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">🏪</span>
                <span className="text-sm sm:text-base font-medium text-[#0F172A] leading-tight tracking-tight">
                  Stores you
                  <br />
                  already trust
                </span>
              </div>
              <div className="rounded-2xl bg-white/70 backdrop-blur-sm ring-1 ring-white/80 px-4 py-5 flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">🤝</span>
                <span className="text-sm sm:text-base font-medium text-[#0F172A] leading-tight tracking-tight">
                  Every order backs
                  <br />
                  a local shopkeeper
                </span>
              </div>
            </div>

            <div className="relative z-10 flex flex-nowrap items-center gap-x-4 gap-y-2">
              {FEATURES.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F172A] whitespace-nowrap"
                >
                  <CheckIcon />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
