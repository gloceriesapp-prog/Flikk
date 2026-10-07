import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/config";
import { AREAS } from "@/lib/seo/areas";
import { POLICY_ORDER, policyHref } from "@/lib/legal/policies";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/partner`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const legalPages: MetadataRoute.Sitemap = POLICY_ORDER.map((slug) => ({
    url: `${SITE.url}${policyHref(slug)}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // One entry per area — grows automatically as AREAS grows.
  const areaPages: MetadataRoute.Sitemap = AREAS.map((a) => ({
    url: `${SITE.url}/delivery/${a.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: a.active ? 0.9 : 0.6,
  }));

  return [...staticPages, ...legalPages, ...areaPages];
}
