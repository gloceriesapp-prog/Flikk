// Legal-entity facts every policy page, the Contact page and the footer read
// from. One source so the business name or a support address can never drift
// between pages that payment gateways and app stores review side by side.
//
// Contact details are env-backed, following SITE.supportPhone's convention:
// nothing is invented, and a row whose value is unset is simply not rendered.
// The support inbox is the one exception: the Play Store delete-account page
// must always show a contact method, so it has a real default.
// Set these in .env before submitting the site for gateway review — see
// .env.example.

import { SITE } from "@/lib/seo/config";

const env = (value: string | undefined) => value?.trim() || null;

const DEFAULT_SUPPORT_EMAIL = "hello@gloceries.com";

export const COMPANY = {
  brand: SITE.name,
  // Registered legal entity, once there is one (set it, and the CIN, when
  // the company is incorporated). Until then the site names only the brand
  // and identifies the business by its registered contact number.
  legalName: null as string | null,
  website: SITE.url,
  region: SITE.region,
  jurisdiction: "Udupi, Karnataka",
  supportEmail: env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ?? DEFAULT_SUPPORT_EMAIL,
  supportPhone: env(SITE.supportPhone),
  registeredAddress: env(process.env.NEXT_PUBLIC_REGISTERED_ADDRESS),
  cin: env(process.env.NEXT_PUBLIC_COMPANY_CIN),
  gstin: env(process.env.NEXT_PUBLIC_COMPANY_GSTIN),
  // Information Technology Rules, 2021 require a named grievance officer.
  grievanceOfficer: {
    name: env(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME),
    email: env(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL) ?? env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ?? DEFAULT_SUPPORT_EMAIL,
  },
  supportHours: env(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
} as const;
