import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import FaqSection from "@/components/faq/FaqSection";
import { SITE } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "List Your Kirana or Grocery Store Online — Sell on Gloceries",
  description:
    "Own a kirana or grocery store? List it free on Gloceries, keep your own inventory and pricing, and reach more customers near you. No dark stores — real local shops.",
  alternates: { canonical: "/partner" },
};

const STEPS = [
  { t: "List your shop free", d: "Add your store and products in minutes. Keep your own stock and your own prices — you're in control." },
  { t: "Get orders from nearby customers", d: "Customers near you order from your shop through the Gloceries app. You get an instant alert for every order." },
  { t: "Pack it, we deliver it", d: "You pack the order; a local Gloceries rider picks it up and delivers it. No logistics for you to manage." },
  { t: "Grow without a warehouse", d: "Reach more of your neighbourhood without owning inventory you don't already have or building your own delivery." },
];

const PARTNER_FAQS = [
  { q: "How much does it cost to list my store on Gloceries?", a: "Listing your store on Gloceries is free. Gloceries earns a small commission per order, so you only pay when you sell." },
  { q: "Do I keep control of my prices and stock?", a: "Yes. You set your own prices and manage your own inventory. Gloceries never owns your stock — your shop stays your shop." },
  { q: "Who handles delivery?", a: "A local Gloceries rider picks up the packed order from your shop and delivers it to the customer. You don't need your own delivery staff." },
  { q: "What kind of stores can join Gloceries?", a: "Kirana stores, grocery shops, supermarkets, dairies, bakeries and pharmacies serving customers in your local area." },
];

export default function PartnerPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main>
        <section className="w-full bg-[linear-gradient(135deg,#060B18_0%,#0B1743_38%,#123A8C_72%,#1E4DE8_100%)] text-white">
          <div className="max-w-[820px] mx-auto px-6 py-16 sm:py-24 text-center flex flex-col items-center gap-5">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
              List your store online. Reach more customers near you.
            </h1>
            <p className="text-base sm:text-lg text-[#BFD4FF] max-w-[620px] leading-relaxed">
              {SITE.name} puts your kirana or grocery shop in front of customers
              in your area — you keep your inventory, your prices and your name.
              No dark stores, no owned stock, no delivery fleet to build.
            </p>
            <a
              href={SITE.androidUrl}
              className="bg-white text-[#0F172A] px-7 py-3.5 rounded-2xl font-bold text-sm shadow-lg mt-2"
            >
              Get the Partner App
            </a>
          </div>
        </section>

        <section className="w-full bg-white py-14 sm:py-20">
          <div className="max-w-[1000px] mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 text-center mb-10">
              How selling on {SITE.name} works
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {STEPS.map((s, i) => (
                <div key={s.t} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6">
                  <div className="w-9 h-9 rounded-full bg-[#0052FF] text-white font-black flex items-center justify-center mb-3">
                    {i + 1}
                  </div>
                  <h3 className="font-black text-slate-900 mb-1.5">{s.t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-slate-600 mt-10">
              Want groceries delivered instead?{" "}
              <Link href="/" className="text-[#0052FF] font-bold underline">
                Order on {SITE.name}
              </Link>
              .
            </p>
          </div>
        </section>

        <FaqSection faqs={PARTNER_FAQS} heading="Selling on Gloceries — FAQs" />
      </main>
      <Footer />
    </div>
  );
}
