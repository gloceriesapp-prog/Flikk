// FAQ content — the single highest-leverage AEO/GEO asset. Rendered
// visibly by FaqSection AND emitted as FAQPage JSON-LD from the same data,
// so answer engines (ChatGPT / Perplexity / AI Overviews) quote copy that
// matches what a human sees. Written in plain, factual, quotable sentences.

import type { Area } from "./areas";
import { SITE } from "./config";

export type Faq = { q: string; a: string };

export const HOME_FAQS: Faq[] = [
  {
    q: "What is Gloceries?",
    a: `${SITE.aiSummary}`,
  },
  {
    q: "How is Gloceries different from Blinkit, Zepto or Instamart?",
    a: "Gloceries has no dark stores and no owned inventory. Instead of a warehouse, your order is fulfilled by real local kirana and grocery shops near you, so prices stay honest, money stays in the neighbourhood, and the stores you already trust are the ones delivering to you.",
  },
  {
    q: "What can I order on Gloceries?",
    a: "Fresh vegetables and fruits, milk and dairy, rice, atta and dal, snacks and beverages, meat and seafood, bakery items, medicines and everyday household essentials — everything a local kirana and grocery store near you stocks.",
  },
  {
    q: "How fast is delivery?",
    a: "Because Gloceries delivers from stores right next to you rather than a distant warehouse, most orders arrive in minutes. Delivery is handled by local riders assigned to the nearest store that has your items.",
  },
  {
    q: "Are there hidden charges?",
    a: "No. Gloceries shows a simple, flat delivery fee up front with no surge pricing and no hidden markups on your groceries.",
  },
  {
    q: "How do I order groceries on Gloceries?",
    a: `Download the Gloceries app for Android or iPhone, set your delivery location, pick items from local stores near you, and pay online. Track your order through to your doorstep.`,
  },
  {
    q: "I own a kirana or grocery store — can I sell on Gloceries?",
    a: "Yes. Gloceries is built for local store owners. You keep your own inventory and pricing, list your shop for free, and reach more customers in your area without owning any delivery logistics yourself.",
  },
];

// Per-area FAQ — feeds each /delivery/<area> page. Localised so every zone
// owns its own "grocery delivery in <area>" conversational query.
export const areaFaqs = (area: Area): Faq[] => {
  const where = `${area.area}, ${area.city}`;
  const live = area.active;
  return [
    {
      q: `Does Gloceries deliver groceries in ${area.area}?`,
      a: live
        ? `Yes. Gloceries delivers groceries, fresh produce, dairy, meat and daily essentials across ${where} from local kirana and grocery stores near you, usually within minutes.`
        : `Gloceries is launching grocery delivery in ${where} soon. Download the app and set your location in ${area.area} to be notified the moment local stores near you go live.`,
    },
    {
      q: `Which stores does Gloceries deliver from in ${area.area}?`,
      a: `Gloceries partners with real local kirana shops, grocery stores and supermarkets in and around ${where} — not a central warehouse — so you order from the neighbourhood stores you already know.`,
    },
    {
      q: `How do I get grocery delivery in ${area.area}?`,
      a: `Download the Gloceries app, set your delivery address in ${area.area}, choose items from stores near you and pay online. A local rider brings your order to your door.`,
    },
    {
      q: `What can I order in ${area.area}?`,
      a: `Vegetables, fruits, milk and dairy, rice, atta, dal, snacks, beverages, meat, seafood, bakery and household essentials — whatever local stores in ${area.area} stock.`,
    },
  ];
};
