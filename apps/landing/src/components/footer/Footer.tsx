"use client";

import React, { useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Location01Icon,
  FavouriteIcon,
  Comment01Icon,
  Store01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  SendIcon,
  HeartIcon,
} from "@hugeicons/core-free-icons";

const LOGO_IMAGE_URL =
  "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/All_Right-removebg-preview.png";

const CATEGORIES_LIST = [
  "Fresh Produce",
  "Kirana & Staples",
  "Bakery & Sweets",
  "Ice Creams",
  "Seafood & Meat",
  "Organic Pantry",
];

const CITIES_LIST = [
  "Mangalore",
  "Udupi",
  "Manipal",
  "Surathkal",
  "Expanding Soon",
];

const FLIKK_ECOSYSTEM = [
  "About Flikk",
  "Partner Kiranas",
  "Rider Fleet",
  "Flikk Merchants",
  "Silicon Coast Tech",
];

const TRUST_LEGAL = [
  "Fast Local Delivery",
  "Zero Hidden Fees",
  "Quality Guarantee",
  "Terms of Service",
  "Privacy Policy",
];

const CONNECT_SUPPORT = [
  "Help & Support",
  "Partner With Us",
  "Store Onboarding",
  "Become a Rider",
];

type ModalType = "none" | "feedback" | "request_store";

export default function Footer() {
  const [activeModal, setActiveModal] = useState<ModalType>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Streamlined Form states
  const [formData, setFormData] = useState({
    cityArea: "",
    contact: "",
    feedback: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    /* 
      3RD-PARTY FORM INTEGRATION INSTRUCTIONS (NOTION / FORMSPREE / TALLY / WEBHOOK):
      To connect to Notion, Formspree, or Tally webhooks:
      1. Paste your endpoint URL below in fetch()
      2. Send JSON payload { ...formData, requestType: activeModal }
    */
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setActiveModal("none");
    setIsSubmitted(false);
    setFormData({ cityArea: "", contact: "", feedback: "" });
  };

  return (
    <footer className="w-full bg-white pt-0 pb-0">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Dark Footer Card Constrained Strictly Inside max-w-[980px] */}
        <div className="w-full bg-[#000000] text-white pt-12 pb-28 sm:pb-36 px-8 sm:px-10 relative overflow-hidden flex flex-col gap-9">
          {/* Top Subtle Neon Gradient Border */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0052FF] to-transparent opacity-80" />

          {/* Brand Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/60 relative z-10">
            <a href="#" className="flex items-center gap-3 group shrink-0">
              <Image
                src={LOGO_IMAGE_URL}
                alt="Flikk Logo"
                width={48}
                height={48}
                style={{ width: "auto", height: "42px" }}
                className="object-contain group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col leading-[1.05]">
                <span className="text-[22px] font-black text-[#FFFFFF] tracking-tight">
                  Flikk
                </span>
                <span className="text-[20px] sm:text-[22px] font-black text-[#FFFFFF] tracking-tight inline-flex items-center gap-1.5">
                  <span>Launching Next in Bangalore 🚀</span>
                </span>
              </div>
            </a>

            {/* <p className="text-xs sm:text-sm text-[#999C9E] max-w-[420px] leading-relaxed font-medium">
              Flikk delivers daily groceries, fresh produce, bakeries & essentials from your trusted local neighborhood stores straight to your doorstep in 15 minutes.
            </p> */}
          </div>

          {/* 5-Column Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-sm relative z-10">
            {/* Column 1: Categories */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Categories
              </h4>
              <ul className="flex flex-col gap-2.5 text-[#999C9E] font-medium text-sm">
                {CATEGORIES_LIST.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200 whitespace-nowrap truncate"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: We Deliver To */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                We Deliver To
              </h4>
              <ul className="flex flex-col gap-2.5 text-[#999C9E] font-medium text-sm">
                {CITIES_LIST.map((city) => (
                  <li key={city}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200 whitespace-nowrap truncate"
                    >
                      {city}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Ecosystem */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Ecosystem
              </h4>
              <ul className="flex flex-col gap-2.5 text-[#999C9E] font-medium text-sm">
                {FLIKK_ECOSYSTEM.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200 whitespace-nowrap truncate"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Customer Trust */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Trust & Safety
              </h4>
              <ul className="flex flex-col gap-2.5 text-[#999C9E] font-medium text-sm">
                {TRUST_LEGAL.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200 whitespace-nowrap truncate"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Connect */}
            <div className="flex flex-col gap-3.5">
              <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Connect
              </h4>
              <ul className="flex flex-col gap-2.5 text-[#999C9E] font-medium text-sm">
                {CONNECT_SUPPORT.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-white hover:translate-x-1 inline-block transition-all duration-200 whitespace-nowrap truncate"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Row: Modern Premium Buttons against pure #000000 background */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 pt-2">
            {/* Left Action Buttons: Feedback & Request Flikk in Your City */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Button 1: Share Feedback */}
              <button
                type="button"
                onClick={() => setActiveModal("feedback")}
                className="bg-[#121212] hover:bg-[#1C1C1E] border border-white/5 hover:border-white/30 text-[#999C9E] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <HugeiconsIcon icon={Comment01Icon} className="w-4 h-4 text-[#0052FF]" />
                <span>Share Feedback</span>
              </button>

              {/* Button 2: Request Flikk in Your City */}
              <button
                type="button"
                onClick={() => setActiveModal("request_store")}
                className="bg-[#121212] hover:bg-[#1C1C1E] border border-white/5 hover:border-white/30 text-[#999C9E] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <HugeiconsIcon icon={Store01Icon} className="w-4 h-4 text-[#EAB308]" />
                <span>Request Flikk in Your City</span>
              </button>
            </div>

            {/* Right End: Real Color Social Brand Icons */}
            <div className="flex items-center gap-3">
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="w-9.5 h-9.5 rounded-xl bg-[#1877F2] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.64 13.72 5.64c1.07 0 2.18.19 2.18.19v2.4h-1.23c-1.23 0-1.62.77-1.62 1.56V12h2.7l-.43 3h-2.27v6.8c4.56-.93 8-4.96 8-9.8z" />
                </svg>
              </a>

              {/* Pinterest */}
              <a
                href="#"
                aria-label="Pinterest"
                className="w-9.5 h-9.5 rounded-xl bg-[#E60023] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.15 2.53 7.71 6.12 9.24-.09-.79-.17-2 .03-2.86.19-.79 1.2-5.11 1.2-5.11s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.89 0 1.32.67 1.32 1.47 0 .89-.57 2.23-.86 3.47-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.27-1.95 3.27-4.77 0-2.49-1.79-4.23-4.34-4.23-2.96 0-4.7 2.22-4.7 4.52 0 .89.34 1.85.77 2.37.08.1.1.19.07.31-.08.31-.25 1.04-.28 1.18-.04.19-.15.23-.35.14-1.31-.61-2.13-2.52-2.13-4.06 0-3.3 2.4-6.34 6.93-6.34 3.64 0 6.47 2.59 6.47 6.06 0 3.61-2.28 6.52-5.44 6.52-1.06 0-2.06-.55-2.4-1.2l-.65 2.48c-.24.91-.88 2.05-1.31 2.74C9.9 21.84 10.93 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#405DE6] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>

              {/* Twitter */}
              <a
                href="#"
                aria-label="Twitter"
                className="w-9.5 h-9.5 rounded-xl bg-[#1DA1F2] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9.5 h-9.5 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-md"
              >
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom Bar: Copyright on Left, Origin Badge on Right End */}
          <div className="pt-6 border-t border-[#999C9E]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-[#999C9E] relative z-10">
            <span>© 2026 Flikk. All rights reserved.</span>
            <span className="inline-flex items-center gap-1.5 text-[#999C9E] font-semibold">
              Made in Udupi <HugeiconsIcon icon={FavouriteIcon} className="w-4 h-4 text-red-500 fill-red-500 inline" /> India&apos;s Silicon Coast
            </span>
          </div>

          {/* Regional Heritage Sentence & Legal Disclaimer */}
          <div className="pt-5 border-t border-[#999C9E]/15 flex flex-col gap-2 text-xs sm:text-sm font-medium text-[#999C9E] leading-relaxed relative z-10">
            <p>
              “Flikk” is owned & managed by &quot;Flikk Commerce Private Limited&quot; and is not related, linked or interconnected in whatsoever manner or nature, to “GROFFR.COM” which is a real estate services business operated by “Redstone Consultancy Services Private Limited”.
            </p>
          </div>
        </div>
      </div>

      {/* PURE BLACK #000000 OVERLAY WITH STREAMLINED CITY REQUEST FORM */}
      {activeModal !== "none" && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-[460px] w-full max-h-[85vh] overflow-y-auto  text-white relative flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            {/* Top Subtle Blue Gradient Hairline Accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0052FF] to-transparent" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#0052FF]/20 rounded-full blur-2xl pointer-events-none" />

            {/* Top Close Button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer z-20"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col gap-1.5 pt-1 relative z-10 pr-8">
              <div className="flex items-center gap-2.5">
                {activeModal === "feedback" ? (
                  <div className="w-9 h-9 rounded-2xl bg-[#0052FF]/15 border border-[#0052FF]/30 text-[#0052FF] flex items-center justify-center shadow-inner">
                    <HugeiconsIcon icon={Comment01Icon} className="w-4.5 h-4.5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#EAB308] flex items-center justify-center shadow-inner">
                    <HugeiconsIcon icon={Store01Icon} className="w-4.5 h-4.5" />
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {activeModal === "feedback"
                    ? "Share Your Feedback"
                    : "Request Flikk in Your City"}
                </h3>
              </div>
              <p className="text-xs text-[#999C9E] leading-relaxed">
                {activeModal === "feedback"
                  ? "Direct line to the Flikk team. Tell us how we can make your delivery experience 10x better!"
                  : "Want Flikk in your city? Tell us where you live - we’ll work quickly to launch in your neighborhood!"}
              </p>
            </div>

            {/* Form Body */}
            {isSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-3 relative z-10">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">Request Received!</h4>
                <p className="text-xs text-[#999C9E] max-w-[320px] leading-relaxed">
                  {activeModal === "request_store"
                    ? "Thank you! We're prioritizing expansions based on demand and will notify you as soon as Flikk launches in your city!"
                    : "Thank you for your feedback! Our team reads every submission."}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs px-7 py-2.5 rounded-xl cursor-pointer transition-all shadow-md active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10 pb-1">
                {activeModal === "request_store" ? (
                  <>
                    {/* Input 1: City & Area Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        City & Locality / Area Name <span className="text-[#0052FF]">*</span>
                      </label>
                      <input
                        type="text"
                        name="cityArea"
                        required
                        placeholder="e.g. Bangalore (Indiranagar) or Kochi (Edappally)"
                        value={formData.cityArea}
                        onChange={handleInputChange}
                        className="bg-[#111111] border border-white/12 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0052FF] focus:bg-[#161618] transition-all"
                      />
                    </div>

                    {/* Input 2: WhatsApp Number for Launch Notification */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        WhatsApp Number / Phone <span className="text-[#0052FF]">*</span>
                      </label>
                      <input
                        type="text"
                        name="contact"
                        required
                        placeholder="e.g. +91 98765 43210 (To notify when we launch!)"
                        value={formData.contact}
                        onChange={handleInputChange}
                        className="bg-[#111111] border border-white/12 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0052FF] focus:bg-[#161618] transition-all"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Share Feedback Form Inputs */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        WhatsApp Number / Email <span className="text-[#0052FF]">*</span>
                      </label>
                      <input
                        type="text"
                        name="contact"
                        required
                        placeholder="e.g. +91 98765 43210 or your@email.com"
                        value={formData.contact}
                        onChange={handleInputChange}
                        className="bg-[#111111] border border-white/12 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0052FF] focus:bg-[#161618] transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        Your Feedback & Suggestions <span className="text-[#0052FF]">*</span>
                      </label>
                      <textarea
                        name="feedback"
                        rows={3}
                        required
                        placeholder="What feature, store, or improvement would make Flikk 10x better for you?"
                        value={formData.feedback}
                        onChange={handleInputChange}
                        className="bg-[#111111] border border-white/12 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0052FF] focus:bg-[#161618] transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Submit & Cancel Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#999C9E] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#0052FF] hover:bg-[#0040E0] active:scale-98 text-white text-xs sm:text-sm font-extrabold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <span>{activeModal === "request_store" ? "Request City Launch" : "Submit Feedback"}</span>
                        <HugeiconsIcon icon={SendIcon} className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
