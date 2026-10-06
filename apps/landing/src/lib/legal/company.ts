// Legal-entity facts every policy page, the Contact page and the footer read
// from. One source so the business name or a support address can never drift
// between pages that payment gateways and app stores review side by side.
//
// Contact details are env-backed, following SITE.supportPhone's convention:
// nothing is invented, and a row whose value is unset is simply not rendered.
// Set these in .env before submitting the site for gateway review — see
// .env.example.

import { SITE } from "@/lib/seo/config";

const env = (value: string | undefined) => value?.trim() || null;

export const COMPANY = {
  brand: SITE.name,
  // Matches the footer disclaimer — the registered owner of the platform.
  legalName: "Tideline Ventures Private Limited",
  website: SITE.url,
  region: SITE.region,
  jurisdiction: "Udupi, Karnataka",
  supportEmail: env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  supportPhone: env(SITE.supportPhone),
  registeredAddress: env(process.env.NEXT_PUBLIC_REGISTERED_ADDRESS),
  cin: env(process.env.NEXT_PUBLIC_COMPANY_CIN),
  gstin: env(process.env.NEXT_PUBLIC_COMPANY_GSTIN),
  // Information Technology Rules, 2021 require a named grievance officer.
  grievanceOfficer: {
    name: env(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME),
    email: env(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL) ?? env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  },
  supportHours: env(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
} as const;
