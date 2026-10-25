import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DeliveryTruck01Icon,
  FlashIcon,
  Store01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { APP_DOWNLOAD_HREF } from "@/lib/links";

const CARDS = [
  {
    image: "https://images.gloceries.com/gloceries-landing/gloceries-hero.png",
    eyebrow: "From stores near you",
    title: "Groceries at your door in 30 minutes",
    alt: "A Gloceries rider handing a bag of fresh groceries to a customer at her door",
    imageClass: "object-cover object-top",
  },
  { image: "/images/indian_store_5.jpg", eyebrow: "Real local stores", title: "Shop from stores you already know", alt: "A neighbourhood grocery store with stocked shelves" },
  { image: "/images/cat_kitchen_restock.jpg", eyebrow: "Fresh every day", title: "Fruits & vegetables from nearby shops", alt: "Fresh vegetables laid out on a table" },
  { image: "/images/cat_morning_needs.jpg", eyebrow: "Morning needs", title: "Milk, bread & butter before breakfast", alt: "Milk bottles, bread and butter" },
  { image: "/images/cat_snack_time.jpg", eyebrow: "Snack time", title: "Chips & munchies for movie night", alt: "A bowl of chips with snack packets" },
  { image: "/images/cat_home_essentials.jpg", eyebrow: "Home care", title: "Cleaners & detergents, restocked fast", alt: "Cleaning sprays and detergent bottles" },
];

const PERKS = [
  { icon: DeliveryTruck01Icon, text: "Free delivery on your first order" },
  { icon: FlashIcon, text: "At your door in 30 minutes" },
  { icon: Store01Icon, text: "Real local stores, no dark stores" },
  { icon: Wallet01Icon, text: "Pay by UPI or cash on delivery" },
];

// Height drives size; aspect ratio sets width (feature square, rest 3:4 portrait) like the reference.
const CARD_BASE = "relative h-[300px] shrink-0 snap-start overflow-hidden rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155DFC] sm:h-[360px] xl:h-[420px]";

function CardText({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
      <span className="inline-block rounded-full bg-black/40 px-3.5 py-1 text-[14px] font-medium text-white backdrop-blur-md sm:text-[16px]">{eyebrow}</span>
      <p className="mt-3 max-w-[380px] text-balance text-[22px] font-semibold leading-[1.2] tracking-tight text-white sm:text-[26px]">{title}</p>
    </div>
  );
}

export default function GloceriesHero() {
  return (
    <section className="bg-[#F2F4F4] pb-8 pt-6" aria-label="Gloceries — groceries from local stores">
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="relative">
        <div className="flex snap-x snap-mandatory gap-4 sm:gap-5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Feature card: cut-out shoppers on brand blue, text at the bottom like the other cards. */}
          <a href={APP_DOWNLOAD_HREF} className={`${CARD_BASE} isolate aspect-square bg-[linear-gradient(180deg,#0B3FB8_0%,#155DFC_55%,#5B8CFF_100%)]`}>
            <h1 className="sr-only">Gloceries — groceries from your trusted local store, at your door in 30 minutes</h1>
            <div className="absolute inset-x-0 bottom-0 h-[92%]">
              <Image
                src="https://images.gloceries.com/appsui/gloceries-web.png"
                alt="Two young shoppers with grocery bags, one showing the Gloceries app"
                fill
                priority
                sizes="(max-width: 640px) 340px, 420px"
                className="object-contain object-bottom"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" aria-hidden="true" />
            <CardText eyebrow="The Gloceries app" title="Order in a few taps, track it to your door" />
          </a>

          {CARDS.map((card, i) => (
            <a key={card.title} href={APP_DOWNLOAD_HREF} className={`${CARD_BASE} aspect-[3/4] bg-slate-200`}>
              <Image
                src={card.image}
                alt={card.alt}
                fill
                sizes="(max-width: 640px) 285px, 375px"
                priority={i < 2}
                className={`${card.imageClass ?? "object-cover"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />
              <CardText eyebrow={card.eyebrow} title={card.title} />
            </a>
          ))}
        </div>

        </div>

        <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((perk) => (
            <li key={perk.text} className="flex items-center gap-3 text-[16px] font-semibold text-[#101C10] sm:text-[18px]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#155DFC]">
                <HugeiconsIcon icon={perk.icon} className="h-5 w-5" />
              </span>
              {perk.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
