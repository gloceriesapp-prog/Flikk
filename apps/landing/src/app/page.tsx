import Navbar from "@/components/navbar/Navbar";
import Hero from "@/components/hero/Hero";
import PromoBanners from "@/components/promo/PromoBanners";
import NearbyStores from "@/components/stores/NearbyStores";
import CategoryGrid from "@/components/categories/CategoryGrid";
import SubcategoriesGrid from "@/components/subcategories/SubcategoriesGrid";
import ProductCarousel from "@/components/products/ProductCarousel";
import Footer from "@/components/footer/Footer";
import FaqSection from "@/components/faq/FaqSection";
import JsonLd from "@/components/seo/JsonLd";
import { HOME_FAQS } from "@/lib/seo/faqs";
import { mobileAppSchema, faqSchema } from "@/lib/seo/schema";
import { fetchCheapestProducts } from "@/lib/products";

// Fixed grid of the 32 cheapest real products — distinct rows, no repeats.
// 32 / 8 cols = exactly 4 rows on the largest breakpoint.
const PRODUCT_GRID_COUNT = 32;

export default async function Home() {
  // Fetched here (Server Component) rather than inside ProductCarousel
  // itself — that component is 'use client' for its scroll-drag
  // interaction, and a client component doing its own Supabase fetch on
  // mount would mean an empty carousel flashing before the real data
  // arrives. Fetching here means the page's own initial HTML already has
  // the real products in it.
  const products = await fetchCheapestProducts(PRODUCT_GRID_COUNT);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between relative">
      <Navbar />
      <JsonLd data={mobileAppSchema()} />
      <JsonLd data={faqSchema(HOME_FAQS)} />
      <main>
        <Hero />
        <PromoBanners />
        <NearbyStores />
        <CategoryGrid />
        <SubcategoriesGrid />
        <ProductCarousel products={products} />
        <FaqSection faqs={HOME_FAQS} />
      </main>
      <Footer />
    </div>
  );
}
