import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import FaqSection from "@/components/faq/FaqSection";
import JsonLd from "@/components/seo/JsonLd";
import { AREAS, getArea } from "@/lib/seo/areas";
import { areaFaqs } from "@/lib/seo/faqs";
import { SITE } from "@/lib/seo/config";
import {
  localBusinessSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/lib/seo/schema";

export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area: slug } = await params;
  const area = getArea(slug);
  if (!area) return {};

  const title = `Grocery Delivery in ${area.area}, ${area.city} — ${SITE.name}`;
  const description = area.active
    ? `Order groceries, fresh produce, dairy, meat & daily essentials online in ${area.area}, ${area.city}. ${SITE.name} delivers from local kirana stores near you — fast, honest pricing, no dark stores.`
    : `${SITE.name} is launching grocery delivery in ${area.area}, ${area.city} soon. Get groceries from local stores near you — download the app and be first to know when we go live.`;

  return {
    title,
    description,
    alternates: { canonical: `/delivery/${area.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE.url}/delivery/${area.slug}`,
      type: "website",
    },
  };
}

// Multi-category — Gloceries partners every kind of local store, not just
// grocery. Icon is an emoji glyph (zero-dep, server-safe); premium feel comes
// from the card treatment, not the glyph.
const CATEGORIES = [
  { icon: "🛒", label: "Groceries & Kirana", blurb: "Rice, atta, dal & staples" },
  { icon: "🥬", label: "Fresh Produce", blurb: "Vegetables & fruits daily" },
  { icon: "🥛", label: "Dairy & Eggs", blurb: "Milk, curd, paneer, eggs" },
  { icon: "🧁", label: "Bakery & Sweets", blurb: "Fresh bread & mithai" },
  { icon: "🍗", label: "Meat & Seafood", blurb: "Fresh cuts & local catch" },
  { icon: "💊", label: "Medicines & Health", blurb: "Pharmacy essentials" },
  { icon: "🔧", label: "Hardware & Plumbing", blurb: "Fittings, tools & repairs" },
  { icon: "🍲", label: "Home & Vessels", blurb: "Kitchenware & daily needs" },
];

const STEPS = [
  {
    n: "01",
    title: "Set your location",
    body: "Open the app and we match you to real stores in your neighbourhood.",
  },
  {
    n: "02",
    title: "Shop across stores",
    body: "Add from groceries, bakery, hardware & more — even across shops, one cart.",
  },
  {
    n: "03",
    title: "Delivered fast",
    body: "A local rider picks it up and brings it to your door — no dark stores.",
  },
];

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area: slug } = await params;
  const area = getArea(slug);
  if (!area) notFound();

  const faqs = areaFaqs(area);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <JsonLd data={localBusinessSchema(area)} />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: `Grocery delivery in ${area.area}`, path: `/delivery/${area.slug}` },
        ])}
      />

      <main>
        {/* Hero — dark aurora gradient, matches home Hero for brand cohesion */}
        <section className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#060B18_0%,#0B1743_38%,#123A8C_72%,#1E4DE8_100%)] text-white">
          {/* Aurora glow blobs */}
          <div className="pointer-events-none absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#3B6BFF] opacity-30 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-28 right-[6%] h-[360px] w-[360px] rounded-full bg-[#A8D93A] opacity-[0.16] blur-[110px]" />
          <div className="pointer-events-none absolute top-1/3 right-1/3 h-[240px] w-[240px] rounded-full bg-[#7C4DFF] opacity-20 blur-[90px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />

          <div className="relative z-10 max-w-[900px] mx-auto px-6 py-16 sm:py-24 text-center flex flex-col items-center gap-6">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/15 px-3.5 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                {area.active && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A8D93A] opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    area.active ? "bg-[#A8D93A]" : "bg-[#BFD4FF]"
                  }`}
                />
              </span>
              {area.active ? "Now delivering" : "Launching soon"} · {area.city}
            </span>

            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-[760px]">
              Grocery Delivery
              <br />
              <span className="bg-gradient-to-r from-white to-[#BFD4FF] bg-clip-text text-transparent">
                in {area.area}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#BFD4FF] max-w-[640px] leading-relaxed">
              {area.active
                ? `Groceries, fresh produce, bakery, medicines, hardware and daily essentials — delivered to your door in ${area.area} from local stores near you. No dark stores, no distant warehouse.`
                : `${SITE.name} is coming to ${area.area}. Download the app and set your location to be first to order from local stores near you.`}
            </p>

            {/* App store buttons — inline SVG, server-safe, matches home Hero */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
              <a
                href={SITE.androidUrl}
                className="w-full sm:w-auto bg-white text-[#0F172A] px-5 py-2.5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2.5 group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M3.609 1.814L13.792 12 3.61 22.186a2.36 2.36 0 0 1-.61-1.614V3.428c0-.624.225-1.205.609-1.614z" />
                  <path fill="#34A853" d="M17.153 8.639L13.792 12l3.361 3.361 4.542-2.555c.784-.441.784-1.171 0-1.612l-4.542-2.555z" />
                  <path fill="#FBBC04" d="M3.609 1.814L13.792 12 17.153 8.639 5.378 1.989A2.296 2.296 0 0 0 3.609 1.814z" />
                  <path fill="#EA4335" d="M17.153 15.361L13.792 12 3.609 22.186c.535-.068 1.128-.27 1.769-.631l11.775-6.194z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium tracking-tight opacity-70">Get it on</span>
                  <span className="text-[15px] font-semibold tracking-tight -mt-0.5">Google Play</span>
                </div>
              </a>
              <a
                href={SITE.iosUrl}
                className="w-full sm:w-auto bg-white/10 border border-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-2xl hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2.5 group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0 group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.95.99-3.09-1 .04-2.17.67-2.88 1.5-.64.74-1.2 1.91-1.05 3.05 1.11.09 2.25-.56 2.94-1.46z" />
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-medium tracking-tight opacity-70">Download on the</span>
                  <span className="text-[15px] font-semibold tracking-tight -mt-0.5">App Store</span>
                </div>
              </a>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-3 text-[13px] text-[#BFD4FF]">
              <span className="flex items-center gap-1.5">⚡ Delivered in ~30 min</span>
              <span className="hidden sm:inline opacity-30">•</span>
              <span className="flex items-center gap-1.5">🏪 Real local stores</span>
              <span className="hidden sm:inline opacity-30">•</span>
              <span className="flex items-center gap-1.5">💸 Honest pricing</span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="w-full bg-white py-16 sm:py-24">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#0052FF]">
                One app, every store
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-2">
                What you can order in {area.area}
              </h2>
              <p className="text-slate-600 max-w-[620px] mx-auto mt-3 leading-relaxed">
                Everything the local stores near you already stock — from shops
                in and around {area.area}, {area.city}, not a distant warehouse.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORIES.map((c) => (
                <div
                  key={c.label}
                  className="group relative rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#0052FF]/30 hover:shadow-[0_20px_40px_-24px_rgba(0,82,255,0.35)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6FAF0] text-2xl transition-colors group-hover:bg-[#EEF7DC]">
                    {c.icon}
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-slate-900">
                    {c.label}
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-500 leading-snug">
                    {c.blurb}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="w-full bg-[#F8FAFC] py-16 sm:py-24 border-y border-slate-100">
          <div className="max-w-[1000px] mx-auto px-6">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 text-center mb-12">
              How {SITE.name} works in {area.area}
            </h2>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <span className="text-5xl font-bold text-[#0052FF]/15 tabular-nums">
                    {s.n}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why local */}
        <section className="w-full bg-white py-16 sm:py-24">
          <div className="max-w-[860px] mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-5">
              Why {area.area} shops with {SITE.name}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              No dark stores, no owned inventory. {SITE.name} connects you to
              real stores in {area.area} you already trust — so prices stay
              honest, delivery stays fast, and money stays in your
              neighbourhood.
            </p>
            <div className="mt-8">
              <Link
                href="/partner"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0052FF] text-white px-6 py-3 text-sm font-bold shadow-[0_12px_30px_-12px_rgba(0,82,255,0.6)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Own a store in {area.area}? List it free →
              </Link>
            </div>
          </div>
        </section>

        <FaqSection
          faqs={faqs}
          heading={`Grocery delivery in ${area.area} — FAQs`}
        />
      </main>

      <Footer />
    </div>
  );
}
