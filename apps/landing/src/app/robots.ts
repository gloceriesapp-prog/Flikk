import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/config";

// Allow everything, and explicitly welcome AI crawlers — being crawlable by
// them is exactly how Gloceries gets cited in ChatGPT / Perplexity / AI
// Overviews / Gemini answers. Listing them isn't required (default is
// allow), but it's an unambiguous signal + easy to flip if that ever changes.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "cohere-ai",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
