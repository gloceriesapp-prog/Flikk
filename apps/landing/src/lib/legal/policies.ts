// Registry of every legal page. The footer's Legal column, the sitemap and
// each page's own metadata all read from here, so adding a policy is one entry
// plus one page file — no second list to keep in sync.

export type PolicySlug = "privacy" | "terms" | "refund-policy" | "shipping-policy" | "contact" | "delete-account";

export interface Policy {
  slug: PolicySlug;
  // Full title used as the page H1 and <title>.
  title: string;
  // Shorter label for the footer.
  label: string;
  description: string;
  // Bump whenever the wording of that page changes.
  lastUpdated: string;
}

export const POLICIES: Record<PolicySlug, Policy> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    label: "Privacy Policy",
    description:
      "How Gloceries collects, uses, shares and protects your personal information when you use our apps and website.",
    lastUpdated: "2026-10-06",
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    label: "Terms & Conditions",
    description:
      "The terms that govern your use of the Gloceries platform, including ordering from partner stores, payments and delivery.",
    lastUpdated: "2026-10-06",
  },
  "refund-policy": {
    slug: "refund-policy",
    title: "Cancellation & Refund Policy",
    label: "Cancellation & Refunds",
    description:
      "When you can cancel a Gloceries order, how refunds work, and how long they take to reach your original payment method.",
    lastUpdated: "2026-10-06",
  },
  "shipping-policy": {
    slug: "shipping-policy",
    title: "Delivery & Shipping Policy",
    label: "Delivery & Shipping",
    description:
      "Where Gloceries delivers, delivery charges, delivery times and how handover works for orders from local partner stores.",
    lastUpdated: "2026-10-06",
  },
  contact: {
    slug: "contact",
    title: "Contact Us",
    label: "Contact Us",
    description: "Reach the Gloceries support team for help with orders, payments, refunds or partnering with us.",
    lastUpdated: "2026-10-06",
  },
  "delete-account": {
    slug: "delete-account",
    title: "Delete Your Gloceries Account",
    label: "Delete Account",
    description:
      "How to request deletion of your Gloceries account, what data is deleted, and what is kept for legal reasons.",
    lastUpdated: "2026-10-09",
  },
};

// Footer order: contact first, then the documents payment gateways check.
export const POLICY_ORDER: PolicySlug[] = ["contact", "terms", "privacy", "refund-policy", "shipping-policy", "delete-account"];

export const policyHref = (slug: PolicySlug) => `/${slug}`;
