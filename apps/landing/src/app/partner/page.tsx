import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import FaqSection from "@/components/faq/FaqSection";
import { SITE } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "List Your Kirana or Grocery Store Online — Sell on Gloceries",
  description:
    "Own a kirana, pharmacy, bakery or hardware store? List it free on Gloceries, keep your own inventory and pricing, and reach more customers near you. No setup cost, weekly payouts, we handle delivery.",
  alternates: { canonical: "/partner" },
};

const STATS = [
  { value: "0%", label: "Setup & listing cost" },
  { value: "~30 min", label: "Avg. delivery to customer" },
  { value: "Weekly", label: "Payouts to your account" },
  { value: "Your", label: "Prices, your stock" },
];

const BENEFITS = [
  { icon: "📈", title: "More customers, zero rent", body: "Reach shoppers across your neighbourhood who never walked past your shop — without opening a second outlet." },
  { icon: "💰", title: "Weekly payouts", body: "Every order settles to your bank account weekly, with a clear statement. No cash-handling, no chasing." },
  { icon: "🏪", title: "You stay in control", body: "Your products, your prices, your stock. We never own inventory or undercut you — you're the store, we're the rails." },
  { icon: "🛵", title: "We handle delivery", body: "Our local rider fleet picks up and delivers. You just pack the order — no hiring, no logistics headache." },
  { icon: "📱", title: "One simple dashboard", body: "Manage the live order queue, catalog and payouts from your phone. Built for a busy counter." },
  { icon: "✅", title: "No dark stores competing", body: "Gloceries has no warehouses undercutting local shops. The whole model is built to send orders to stores like yours." },
];

const STEPS = [
  { n: "01", title: "Apply in the app", body: "Download the Gloceries Partner app and submit your store details + KYC. Takes a few minutes." },
  { n: "02", title: "Get verified", body: "We verify your store and documents, then approve your account for the launch zone." },
  { n: "03", title: "Add your catalog", body: "List what you already stock — set prices and availability from the dashboard or app." },
  { n: "04", title: "Start receiving orders", body: "Go live. Orders arrive, you pack, our rider delivers, you get paid weekly." },
];

const CATEGORIES = [
  { icon: "🛒", label: "Kirana & Grocery" },
  { icon: "💊", label: "Pharmacy" },
  { icon: "🧁", label: "Bakery & Sweets" },
  { icon: "🥬", label: "Fruits & Vegetables" },
  { icon: "🔧", label: "Hardware & Plumbing" },
  { icon: "🍲", label: "Vessels & Home" },
  { icon: "🥛", label: "Dairy & Eggs" },
  { icon: "🍗", label: "Meat & Seafood" },
];

const PARTNER_FAQS = [
  { q: "How much does it cost to list my store on Gloceries?", a: "Nothing to list or set up. Gloceries earns a small commission per order once you start selling — there's no upfront fee, no monthly rent, no listing charge." },
  { q: "Do I keep control of my prices and stock?", a: "Yes. You set your own prices and manage your own inventory at all times. Gloceries never owns your stock or sets your prices — your shop stays your shop." },
  { q: "Who handles delivery?", a: "A local Gloceries rider picks up the packed order from your shop and delivers it to the customer. You don't need your own delivery staff." },
  { q: "When and how do I get paid?", a: "Orders settle to your registered bank account weekly, with a clear statement of every order and the commission taken." },
  { q: "What kind of stores can join Gloceries?", a: "Any local store — kirana, pharmacy, bakery, fruits & vegetables, hardware, vessels, dairy and more. If you stock it, you can sell it." },
];

export default function PartnerPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#060B18_0%,#0B1743_38%,#123A8C_72%,#1E4DE8_100%)] text-white">
          <div className="pointer-events-none absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#3B6BFF] opacity-30 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-28 right-[6%] h-[360px] w-[360px] rounded-full bg-[#A8D93A] opacity-[0.16] blur-[110px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 text-[12px] font-semibold bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 rounded-full">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A8D93A]" />
                Now onboarding stores in coastal Karnataka
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.05]">
                Grow your store with
                <br />
                <span className="bg-gradient-to-r from-white to-[#BFD4FF] bg-clip-text text-transparent">
                  local online delivery.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-[#BFD4FF] max-w-[560px] leading-relaxed">
                List your shop on {SITE.name} and reach customers across your
                neighbourhood. Keep your own prices, we handle the delivery —
                you get more orders and weekly payouts. No setup cost.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-1">
                <a
                  href="#apply"
                  className="inline-flex items-center gap-2 bg-[#0052FF] text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-[0_14px_34px_-12px_rgba(0,82,255,0.7)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  Become a partner →
                </a>
                <a
                  href={SITE.androidUrl}
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-white/15 transition-all duration-200"
                >
                  Get the Partner app
                </a>
              </div>
            </div>

            {/* Stat panel */}
            <div className="rounded-3xl border border-white/12 bg-white/[0.06] backdrop-blur-sm p-6 sm:p-8">
              <div className="grid grid-cols-2 gap-6">
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col gap-1">
                    <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-white tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-[13px] text-[#BFD4FF] leading-snug">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="bg-white py-20 sm:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-[640px] mb-14">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#0052FF]">
                Why sell on {SITE.name}
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0F172A] mt-2">
                Built to send orders to shops like yours.
              </h2>
              <p className="text-slate-600 mt-3 leading-relaxed">
                We&apos;re the software and delivery layer on top of the store you
                already run — not a warehouse competing with it.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#0052FF]/30 hover:shadow-[0_20px_40px_-24px_rgba(0,82,255,0.35)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6FAF0] text-xl">
                    {b.icon}
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-[#0F172A]">{b.title}</h3>
                  <p className="mt-1.5 text-[13.5px] text-slate-500 leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-[#F8FAFC] py-20 sm:py-28 border-y border-slate-100">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[640px] mx-auto mb-14">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#0052FF]">
                From apply to first order
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0F172A] mt-2">
                Live in four simple steps.
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <span className="text-5xl font-bold text-[#0052FF]/15 tabular-nums">{s.n}</span>
                  <h3 className="mt-2 text-lg font-bold text-[#0F172A]">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="bg-white py-20 sm:py-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[640px] mx-auto mb-14">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#0052FF]">
                Any local store
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#0F172A] mt-2">
                If you stock it, you can sell it.
              </h2>
              <p className="text-slate-600 mt-3 leading-relaxed">
                {SITE.name} isn&apos;t grocery-only. We onboard every kind of
                neighbourhood shop.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CATEGORIES.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-[#0052FF]/30 hover:bg-[#F8FAFC]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6FAF0] text-xl">
                    {c.icon}
                  </span>
                  <span className="text-[14px] font-semibold text-[#0F172A]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* APPLY BAND */}
        <section id="apply" className="relative overflow-hidden bg-[linear-gradient(135deg,#060B18_0%,#0B1743_38%,#123A8C_72%,#1E4DE8_100%)] text-white">
          <div className="pointer-events-none absolute -top-24 right-[10%] h-[360px] w-[360px] rounded-full bg-[#3B6BFF] opacity-30 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-[360px] w-[360px] rounded-full bg-[#A8D93A] opacity-[0.16] blur-[110px]" />
          <div className="relative z-10 max-w-[820px] mx-auto px-6 py-20 sm:py-28 text-center flex flex-col items-center gap-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1]">
              Apply from the {SITE.name} Partner app.
            </h2>
            <p className="text-[#BFD4FF] max-w-[560px] leading-relaxed">
              New stores register and complete KYC in the Partner app — a few
              minutes and you&apos;re in the verification queue. Want groceries
              delivered instead?{" "}
              <Link href="/" className="text-white font-semibold underline">
                Order on {SITE.name}
              </Link>
              .
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
              <a
                href={SITE.androidUrl}
                className="inline-flex items-center gap-2 bg-white text-[#0F172A] px-6 py-3 rounded-2xl font-semibold text-sm shadow-[0_14px_34px_-14px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Get it on Google Play
              </a>
              <a
                href={SITE.iosUrl}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-white/15 transition-all duration-200"
              >
                Download on the App Store
              </a>
            </div>
          </div>
        </section>

        <FaqSection faqs={PARTNER_FAQS} heading="Selling on Gloceries — FAQs" />
      </main>
      <Footer />
    </div>
  );
}
