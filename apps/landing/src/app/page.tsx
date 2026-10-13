import Navbar from "@/components/navbar/Navbar";
import ExperienceBanner from "@/components/experience/ExperienceBanner";
import NearbyStores from "@/components/stores/NearbyStores";
import SubcategoriesGrid from "@/components/subcategories/SubcategoriesGrid";
import ProductCarousel from "@/components/products/ProductCarousel";
import AreaStrip from "@/components/location/AreaStrip";
import Footer from "@/components/footer/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { mobileAppSchema } from "@/lib/seo/schema";
import { fetchCheapestProducts } from "@/lib/products";
import { getArea } from "@/lib/seo/areas";

// Fixed grid of the 32 cheapest real products — distinct rows, no repeats.
// 32 / 8 cols = exactly 4 rows on the largest breakpoint.
const PRODUCT_GRID_COUNT = 32;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const products = await fetchCheapestProducts(PRODUCT_GRID_COUNT);

  // Footer live-zone links land here as `/?area=<slug>`. Surface that zone as
  // a headline strip above the fold. Only live zones get the strip (soon zones
  // link to their /delivery/<slug> page instead); an unknown/inactive slug
  // just renders the normal home.
  const { area: areaSlug } = await searchParams;
  const area = areaSlug ? getArea(areaSlug) : undefined;
  const activeArea = area?.active ? area : undefined;

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between relative">
      <Navbar />
      <JsonLd data={mobileAppSchema()} />
      <main>
        {activeArea && <AreaStrip area={activeArea.area} />}
        <ExperienceBanner />
        <NearbyStores />
        <SubcategoriesGrid />
        <ProductCarousel products={products} />
      </main>
      <Footer />
    </div>
  );
}
