import type { Metadata } from "next";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import { SITE } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "About Gloceries — Hyperlocal Grocery Delivery from Local Stores",
  description:
    "Gloceries is a hyperlocal grocery delivery app connecting you to real local kirana and grocery stores near you. No dark stores, honest pricing, built for your neighbourhood.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main>
        <section className="w-full bg-white py-16 sm:py-24">
          <div className="max-w-[720px] mx-auto px-6 flex flex-col gap-6">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Groceries from the stores you already love.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">{SITE.aiSummary}</p>
            <p className="text-slate-600 leading-relaxed">
              Most instant-delivery apps run on dark stores — hidden warehouses
              stocking their own inventory. {SITE.name} does the opposite. We
              connect you to the real kirana shops, grocery stores and
              supermarkets already in your neighbourhood, and a local rider
              brings your order to your door. That keeps prices honest, delivery
              fast, and money in your local economy.
            </p>
            <p className="text-slate-600 leading-relaxed">
              {SITE.name} is built for {SITE.region} and every zone it grows
              into — so wherever you search for grocery delivery near you, the
              local stores you trust can reach you.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
