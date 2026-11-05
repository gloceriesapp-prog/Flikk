"use client";

import { useSearchParams } from "next/navigation";
import AreaStrip from "./AreaStrip";
import { getArea } from "@/lib/seo/areas";

// Footer live-zone links land on `/?area=<slug>`. Read in the browser so the
// home page itself stays static (cached) instead of rendering per request.
// Only live zones get the strip; unknown/inactive slugs render nothing.
export default function AreaStripFromQuery() {
  const slug = useSearchParams().get("area");
  const area = slug ? getArea(slug) : undefined;
  return area?.active ? <AreaStrip area={area.area} /> : null;
}
