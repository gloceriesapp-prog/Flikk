import type { NextConfig } from "next";

// Gate on an EXPLICIT prod signal (VERCEL_ENV/APP_ENV), NOT bare NODE_ENV:
// CI runs `next build` with NODE_ENV=production but no VERCEL_ENV, and local
// dev must keep the localhost fallback — only a real prod deploy fails loud.
if (process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production") {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  let host: string | undefined;
  try {
    host = url ? new URL(url).hostname.toLowerCase() : undefined;
  } catch {
    /* falls through to the throw below */
  }
  const isPublicHttps =
    !!url &&
    url.startsWith("https://") &&
    !!host &&
    host !== "localhost" &&
    !host.endsWith(".localhost") &&
    !host.endsWith(".local") &&
    host !== "127.0.0.1";
  if (!isPublicHttps) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must be set to a public https:// URL for production builds (got: ${url ?? "unset"}).`,
    );
  }
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bjlknohjdnemxwwoxcsv.supabase.co",
      },
    ],
  },
};

export default nextConfig;
