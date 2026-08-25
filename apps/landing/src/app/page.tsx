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

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between relative">
      <Navbar />
      <main>
        <Hero />
        <PromoBanners />
        <NearbyStores />
        <CategoryGrid />
        <SubcategoriesGrid />
        <ProductCarousel />
        <PartnerSection />
        <AppDownloadBanner />
      </main>
      <Footer />
      <StickyBottomDock />
    </div>
  );
}
