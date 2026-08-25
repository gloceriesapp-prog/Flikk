"use client";

import React from "react";
import { Store, Bike, ArrowRight, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";

export default function PartnerSection() {
  return (
    <section className="w-full bg-white pb-14 pt-4">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Dual Partner Grid: Store Owners & Delivery Partners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Card 1: Merchant / Store Owner CTA */}
          <div className="rounded-3xl bg-[#0F172A] text-white p-7 sm:p-8 flex flex-col justify-between border border-slate-800 transition-colors">
            <div className="flex flex-col gap-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-[#60A5FA] px-3 py-1 rounded-full text-xs font-bold w-fit">
                <Store className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>FOR STORE OWNERS</span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Own a Store?
                  <br />
                  <span className="text-[#60A5FA]">Grow Your Business Online.</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-[360px]">
                  List your kirana, supermarket or bakery on Flikk. Reach thousands of customers in Mangalore with 10-minute instant delivery.
                </p>
              </div>

              {/* Quick Feature Perks */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>3x More Daily Sales</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Setup in 24 Hours</span>
                </div>
              </div>
            </div>

            {/* CTA Button - Flat, Crisp, No Shadow */}
            <div className="pt-6">
              <a
                href="#list-my-store"
                className="inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3.5 rounded-2xl font-extrabold text-sm transition-colors group/btn cursor-pointer w-full sm:w-auto"
              >
                <span>List My Store</span>
                <ArrowRight className="w-4 h-4 text-slate-900 group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Card 2: Delivery Partner CTA */}
          <div className="rounded-3xl bg-[#FFFBEB] text-slate-900 p-7 sm:p-8 flex flex-col justify-between border border-amber-200/80 transition-colors">
            <div className="flex flex-col gap-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-amber-900/10 border border-amber-900/20 text-amber-900 px-3 py-1 rounded-full text-xs font-bold w-fit">
                <Bike className="w-3.5 h-3.5 text-amber-900" />
                <span>DELIVERY PARTNERS</span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Deliver & Earn
                  <br />
                  <span className="text-amber-800">On Your Own Schedule.</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed max-w-[360px]">
                  Join the Flikk rider fleet in Mangalore. Enjoy flexible working hours, weekly payouts, and attractive per-delivery incentives.
                </p>
              </div>

              {/* Quick Feature Perks */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Instant Daily Payouts</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Free Accident Insurance</span>
                </div>
              </div>
            </div>

            {/* CTA Button - Flat, Crisp, No Shadow */}
            <div className="pt-6">
              <a
                href="#become-partner"
                className="inline-flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-extrabold text-sm transition-colors group/btn cursor-pointer w-full sm:w-auto"
              >
                <span>Become a Partner</span>
                <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
