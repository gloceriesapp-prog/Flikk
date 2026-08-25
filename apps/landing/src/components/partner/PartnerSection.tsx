"use client";

import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Store01Icon,
  Motorbike01Icon,
  ArrowRight01Icon,
  ShieldCheckIcon,
  AnalyticsUpIcon,
  BankIcon,
} from "@hugeicons/core-free-icons";

const BIKE_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/bike1.png";

const STORE_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/store.png";

export default function PartnerSection() {
  return (
    <section className="w-full bg-white pb-14 pt-4">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Dual Partner Grid: Store Owners & Delivery Partners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Card 1: Merchant / Store Owner CTA */}
          <div className="rounded-3xl bg-gradient-to-br from-[#F7FEE7] via-[#D9F99D] to-[#10B981]/30 text-slate-950 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all min-h-[380px] shadow-xs">
            {/* Absolute Bottom-Right Store Background Image */}
            <div className="absolute -bottom-3 -right-3 sm:-bottom-5 sm:-right-5 w-52 sm:w-64 md:w-72 pointer-events-none select-none z-0 opacity-40 sm:opacity-45">
              <Image
                src={STORE_IMAGE_URL}
                alt="Flikk Merchant Store"
                width={360}
                height={360}
                className="w-full h-auto object-contain drop-shadow-md"
              />
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-lime-950/10 border border-lime-950/20 text-[#15803D] px-3 py-1 rounded-full text-xs font-black w-fit">
                <HugeiconsIcon icon={Store01Icon} className="w-3.5 h-3.5 text-[#15803D]" />
                <span>FOR STORE OWNERS</span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 leading-tight">
                  Own a Store?
                  <br />
                  <span className="text-[#15803D]">Grow Your Business Online.</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed max-w-[340px]">
                  List your kirana, supermarket or bakery on Flikk. Reach thousands of customers in Mangalore with fast local delivery.
                </p>
              </div>

              {/* Quick Feature Perks */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-950">
                  <HugeiconsIcon icon={AnalyticsUpIcon} className="w-4.5 h-4.5 text-[#15803D] shrink-0" />
                  <span>3x More Daily Sales</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-950">
                  <HugeiconsIcon icon={ShieldCheckIcon} className="w-4.5 h-4.5 text-amber-700 shrink-0" />
                  <span>Setup in 5 minutes</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6 relative z-10">
              <a
                href="#list-my-store"
                className="inline-flex items-center justify-center gap-2.5 bg-black hover:bg-slate-900 text-white px-6.5 py-3.5 rounded-2xl font-extrabold text-sm transition-all group/btn cursor-pointer w-full sm:w-auto shadow-md"
              >
                <span>List My Store</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Card 2: Delivery Partner CTA */}
          <div className="rounded-3xl bg-gradient-to-br from-[#FEF3C7] via-[#FDE047]/90 to-[#F59E0B]/20 text-slate-950 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all min-h-[380px] shadow-xs">
            {/* Absolute Bottom-Right Delivery Bike Background Image */}
            <div className="absolute -bottom-3 -right-3 sm:-bottom-5 sm:-right-5 w-52 sm:w-64 md:w-72 pointer-events-none select-none z-0 opacity-40 sm:opacity-45">
              <Image
                src={BIKE_IMAGE_URL}
                alt="Flikk Delivery Partner Bike"
                width={360}
                height={360}
                className="w-full h-auto object-contain drop-shadow-md"
              />
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-amber-950/10 border border-amber-950/20 text-[#78350F] px-3 py-1 rounded-full text-xs font-black w-fit">
                <HugeiconsIcon icon={Motorbike01Icon} className="w-3.5 h-3.5 text-[#78350F]" />
                <span>DELIVERY PARTNERS</span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 leading-tight">
                  Deliver & Earn
                  <br />
                  <span className="text-[#B45309]">On Your Own Schedule.</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed max-w-[340px]">
                  Join the Flikk rider fleet in Mangalore. Enjoy flexible working hours, weekly payouts, and attractive per-delivery incentives.
                </p>
              </div>

              {/* Quick Feature Perks */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-950">
                  <HugeiconsIcon icon={BankIcon} className="w-4.5 h-4.5 text-[#92400E] shrink-0" />
                  <span>Instant Daily Payouts</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-950">
                  <HugeiconsIcon icon={ShieldCheckIcon} className="w-4.5 h-4.5 text-emerald-800 shrink-0" />
                  <span>Free Accident Insurance</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6 relative z-10">
              <a
                href="#become-partner"
                className="inline-flex items-center justify-center gap-2.5 bg-black hover:bg-slate-900 text-white px-6.5 py-3.5 rounded-2xl font-extrabold text-sm transition-all group/btn cursor-pointer w-full sm:w-auto shadow-md"
              >
                <span>Become a Partner</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
