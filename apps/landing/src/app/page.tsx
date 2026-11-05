import Navbar from "@/components/navbar/Navbar";
import GloceriesHero from "@/components/hero/GloceriesHero";
import BrandShowcase from "@/components/brands/BrandShowcase";
import NearbyStores from "@/components/stores/NearbyStores";
import LocalPicks from "@/components/local/LocalPicks";
import AppDownloadBanner from "@/components/download/AppDownloadBanner";
import SubcategoriesGrid from "@/components/subcategories/SubcategoriesGrid";
import ProductCarousel from "@/components/products/ProductCarousel";
import AreaStrip from "@/components/location/AreaStrip";
import Footer from "@/components/footer/Footer";
import JsonLd from "@/components/seo/JsonLd";
import { mobileAppSchema } from "@/lib/seo/schema";
import { fetchLandingCatalogue } from "@/lib/products";
import { getArea } from "@/lib/seo/areas";

// Category shelves under the trending grid: the categories with the most
// live products, one row of up to 8 (one full row on xl) each.
const SHELF_COUNT = 4;
const SHELF_MIN_PRODUCTS = 4;
const SHELF_LIMIT = 8;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { categories, products } = await fetchLandingCatalogue();
  const shelves = categories
    .filter((c) => c.products.length >= SHELF_MIN_PRODUCTS)
    .sort((a, b) => b.products.length - a.products.length)
    .slice(0, SHELF_COUNT);

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
        <GloceriesHero />
        <SubcategoriesGrid categories={categories} />
        <ProductCarousel products={products} />
        {shelves.map((c) => (
          <ProductCarousel key={c.id} title={c.name} products={c.products} limit={SHELF_LIMIT} />
        ))}
        <BrandShowcase />
        <LocalPicks products={[...products.slice(16), ...products.slice(0, 16)].slice(0, 10)} />
        <NearbyStores />
        <AppDownloadBanner />
      </main>
      <Footer />
    </div>
  );
}
