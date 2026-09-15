import Navbar from "@/components/navbar/Navbar";
import Hero from "@/components/hero/Hero";
import PromoBanners from "@/components/promo/PromoBanners";
import NearbyStores from "@/components/stores/NearbyStores";
import CategoryGrid from "@/components/categories/CategoryGrid";
import SubcategoriesGrid from "@/components/subcategories/SubcategoriesGrid";
import ProductCarousel from "@/components/products/ProductCarousel";
import PartnerSection from "@/components/partner/PartnerSection";
import AppDownloadBanner from "@/components/download/AppDownloadBanner";
import Footer from "@/components/footer/Footer";
import StickyBottomDock from "@/components/download/StickyBottomDock";
import { fetchRandomProducts } from "@/lib/products";

const PRODUCT_CAROUSEL_COUNT = 8;

export default async function Home() {
  // Fetched here (Server Component) rather than inside ProductCarousel
  // itself — that component is 'use client' for its scroll-drag
  // interaction, and a client component doing its own Supabase fetch on
  // mount would mean an empty carousel flashing before the real data
  // arrives. Fetching here means the page's own initial HTML already has
  // the real products in it.
  const products = await fetchRandomProducts(PRODUCT_CAROUSEL_COUNT);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between relative">
      <Navbar />
      <main>
        <Hero />
        <PromoBanners />
        <NearbyStores />
        <CategoryGrid />
        <SubcategoriesGrid />
        <ProductCarousel products={products} />
        <PartnerSection />
        <AppDownloadBanner />
      </main>
      <Footer />
      <StickyBottomDock />
    </div>
  );
}
