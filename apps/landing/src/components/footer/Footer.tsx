import Image from "next/image";
import { AREAS } from "@/lib/seo/areas";
import { POLICIES, POLICY_ORDER, policyHref } from "@/lib/legal/policies";
import { COMPANY as LEGAL_ENTITY } from "@/lib/legal/company";
import { FooterAppBadges } from "./FooterAppBadges";
import { FooterSocialLinks } from "./FooterSocialLinks";

type FooterLink = { label: string; href: string };

const COMPANY: FooterLink[] = [
  { label: "About Gloceries", href: "/about" },
  { label: "Partner with us", href: "/partner" },
  { label: "Become a rider", href: "/partner#rider" },
];
const LEGAL: FooterLink[] = POLICY_ORDER.map((slug) => ({
  label: POLICIES[slug].label,
  href: policyHref(slug),
}));
const FOOTER_LINK_CLASS = "rounded-sm text-[15px] leading-6 text-[#000000] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF]";

function LinkColumn({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-4 text-[16px] font-semibold tracking-tight text-[#192334]">{title}</h3>
      <ul className="space-y-2 text-[15px] leading-6">
        {items.map((item) => <li key={item.href}><a href={item.href} className={FOOTER_LINK_CLASS}>{item.label}</a></li>)}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-[#F3F5F9] text-[#192334]">
      <div className="mx-auto max-w-[1280px] px-6 pb-6 pt-12 sm:pt-14 lg:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-14">
          <LinkColumn title="About Gloceries" items={COMPANY} />
          <LinkColumn title="Legal" items={LEGAL} />

          {/* Keep every live and upcoming delivery route crawlable. */}
          <nav aria-label="Delivery Areas">
            <h3 className="mb-4 text-[16px] font-semibold tracking-tight">Delivery Areas</h3>
            <ul className="space-y-2 text-[15px] leading-6">
              {AREAS.map((area) => (
                <li key={area.slug}>
                  <a href={area.active ? `/?area=${area.slug}` : `/delivery/${area.slug}`} className={`${FOOTER_LINK_CLASS} inline-flex flex-wrap items-center gap-2`}>
                    Delivery in {area.area}
                    {area.active ? <span className="h-1.5 w-1.5 rounded-full bg-[#35966E]" aria-label="Available now" /> : <span className="rounded border border-[#D6DCE5] px-1 text-[10px] font-medium uppercase leading-4 tracking-wide text-[#687385]">Soon</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <LinkColumn title="Support & Services" items={[
              { label: "Contact Us", href: "/contact" },
              { label: "Partner with us", href: "/partner" },
              { label: "Cancellation & Refunds", href: "/refund-policy" },
            ]} />
            <div className="mt-9">
              <h3 className="mb-3 text-[16px] font-semibold tracking-tight">Region / Country</h3>
              <div className="inline-flex min-h-10 items-center gap-2.5 rounded-md bg-white px-3 py-2 text-[14px] text-[#253044]">
                <span role="img" aria-label="India flag" className="text-[22px] leading-none">🇮🇳</span>
                <span>India · English</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-11 grid gap-x-10 gap-y-8 pb-7 sm:grid-cols-2 xl:flex xl:items-start xl:justify-between xl:gap-12">
          <div id="app-download-banner" className="scroll-mt-40 xl:shrink-0">
            <h3 className="mb-4 text-[16px] font-semibold tracking-tight">Download Our App</h3>
            <FooterAppBadges />
          </div>
          <div className="min-w-0 xl:w-[440px] xl:shrink-0">
            <h3 className="mb-4 text-[16px] font-semibold tracking-tight">Payment Methods</h3>
            <div className="relative h-12 w-full max-w-[440px]">
              <Image src="/images/footer/payment-methods.png" alt="UPI, Visa, Mastercard, RuPay, netbanking and cash" fill sizes="(max-width: 640px) 90vw, 440px" className="object-cover object-center" />
            </div>
          </div>
          <div className="xl:shrink-0">
            <h3 className="mb-4 text-[16px] font-semibold tracking-tight">Stay Connected</h3>
            <div className="flex min-h-12 items-center"><FooterSocialLinks /></div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#000000]/10 py-6 text-[15px] text-[#000000] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Gloceries. All rights reserved.</p>
          <p className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span>Made in Udupi</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true" focusable="false">
              <path d="M12.2499 21.1717L11.9499 21.0417C7.23994 18.9517 2.22994 14.8517 2.24994 9.59169C2.25994 6.49169 3.97994 4.00169 6.72994 3.12169C8.83994 2.44169 10.7699 2.95169 12.2499 4.56169C13.7299 2.95169 15.6599 2.44169 17.7699 3.12169C20.5199 4.01169 22.2399 6.49169 22.2499 9.60169C22.2799 14.8517 17.2599 18.9517 12.5499 21.0417L12.2499 21.1717Z" fill="#EF4444" />
            </svg>
            <span>India&apos;s Silicon Coast</span>
          </p>
        </div>

        <div className="space-y-2 border-t border-[#000000]/10 pt-4 text-[15px] leading-relaxed text-[#000000] ">
          <span>
            “Gloceries” is a technology platform{LEGAL_ENTITY.legalName ? ` owned & managed by ${LEGAL_ENTITY.legalName}` : ""} connecting customers with trusted local kirana stores, making everyday shopping easier and more convenient. All products are sold by independent partner stores, and Gloceries does not own or maintain product inventory. Product prices, availability, and delivery times may vary depending on the store and location.
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap gap-x-2">
              <span>Contact:</span>
              {LEGAL_ENTITY.supportEmail && <a className="underline underline-offset-2" href={`mailto:${LEGAL_ENTITY.supportEmail}`}>{LEGAL_ENTITY.supportEmail}</a>}

            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
