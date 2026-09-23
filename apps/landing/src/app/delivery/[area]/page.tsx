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

const CATEGORIES = [
  "Fresh Vegetables",
  "Fruits",
  "Milk & Dairy",
  "Rice, Atta & Dal",
  "Snacks & Beverages",
  "Meat & Seafood",
  "Bakery & Sweets",
  "Medicines & Essentials",
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
        {/* Hero */}
        <section className="w-full bg-[linear-gradient(135deg,#060B18_0%,#0B1743_38%,#123A8C_72%,#1E4DE8_100%)] text-white">
          <div className="max-w-[900px] mx-auto px-6 py-16 sm:py-24 text-center flex flex-col items-center gap-5">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/15 px-3 py-1 rounded-full">
              {area.active ? "Now delivering" : "Launching soon"} · {area.city}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1] max-w-[720px]">
              Grocery Delivery in {area.area}
            </h1>
            <p className="text-base sm:text-lg text-[#BFD4FF] max-w-[620px] leading-relaxed">
              {area.active
                ? `Get groceries, fresh produce, dairy, meat and daily essentials delivered to your door in ${area.area} from local kirana and grocery stores near you.`
                : `${SITE.name} is coming to ${area.area}. Download the app and set your location to be first to order from local stores near you.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <a
                href={SITE.androidUrl}
                className="bg-white text-[#0F172A] px-6 py-3 rounded-2xl font-bold text-sm shadow-lg"
              >
                Get it on Google Play
              </a>
              <a
                href={SITE.iosUrl}
                className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-2xl font-bold text-sm"
              >
                Download on the App Store
              </a>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="w-full bg-white py-14 sm:py-20">
          <div className="max-w-[1100px] mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 text-center mb-3">
              What you can order in {area.area}
            </h2>
            <p className="text-slate-600 text-center max-w-[640px] mx-auto mb-10 leading-relaxed">
              Everything the local stores near you already stock — delivered
              from shops in and around {area.area}, {area.city}, not a distant
              warehouse.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {CATEGORIES.map((c) => (
                <div
                  key={c}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-5 text-center text-sm font-bold text-slate-800"
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why local */}
        <section className="w-full bg-[#F8FAFC] py-14 sm:py-20">
          <div className="max-w-[820px] mx-auto px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-4">
              Why {area.area} shops with {SITE.name}
            </h2>
            <p className="text-slate-600 leading-relaxed">
              No dark stores, no owned inventory. {SITE.name} connects you to
              real kirana and grocery stores in {area.area} you already trust —
              so prices stay honest, delivery stays fast, and money stays in
              your neighbourhood. Own a store in {area.area}?{" "}
              <Link href="/partner" className="text-[#0052FF] font-bold underline">
                List it free on {SITE.name}
              </Link>
              .
            </p>
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
