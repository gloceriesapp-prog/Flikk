import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0052FF",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: SITE.logo, sizes: "512x512", type: "image/png" },
    ],
  };
}
