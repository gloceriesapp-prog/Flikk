// Home "All" tab body — now ADMIN-DRIVEN. The order, on/off, title/subtitle
// override, and optional bg color of every section come from GET /home/sections
// (useHomeSections -> home_sections table, edited in admin's "Home Sections"
// screen). This file no longer hardcodes the layout; it maps the admin config
// over a code-level SECTION_REGISTRY (key -> how to render that section).
//
// Fail-safe: if the config fetch fails or returns nothing, we fall back to
// FALLBACK_ORDER (the previous hardcoded order) with everything enabled — so
// the Home screen never goes blank because the config call hiccuped. A section
// key in the config with no registry entry is skipped; a registry section with
// no config row only appears via the fallback (add a seed row in
// migration 058 when you add a new code section).
//
// Only rendered when "all" is selected — see HomeScreen.tsx.
//
// Store-scoping unchanged: useNearestStore resolves the one nearest store here
// and the deals feeds (useDealsProducts) query that store's own catalog.
// Festival content belongs to Navratri. In All, Quick categories continues
// the header background; catalogue sections follow on their own surfaces.

import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { BrandFooter } from '../../../components/BrandFooter';
import { DealsSection } from '../deals/DealsSection';
import { PriceDropsSection } from '../deals/PriceDropsSection';
import { DealsForYouSection } from '../deals/DealsForYouSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { MostBoughtSection } from '../most-bought/MostBoughtSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { QuickCategoriesSection } from '../quick-categories/QuickCategoriesSection';
import { HomeWelcomeBanner } from '../welcome-banner/HomeWelcomeBanner';
import { EverydayDairySection } from '../everyday-dairy/EverydayDairySection';
import { useActiveHeaderGradient } from '../data/useActiveHeaderGradient';
import { NewOnGloceriesSection } from '../new-on-gloceries/NewOnGloceriesSection';
import { ProductSection } from '../products/ProductSection';
import { TopRatedStoresSection } from '../top-rated-stores/TopRatedStoresSection';
import { TrendingSection } from '../trending/TrendingSection';
import { useNearestStore } from '../useNearestStore';
import { useDealsProducts } from './useDealsProducts';
import { useHomeSections, type HomeSectionConfig } from '../useHomeSections';
import type { Product } from '../products/types';
import { useNearbyGroceryInventory } from '../groceries/useNearbyGroceryInventory';
import { BrowseLoadingText } from '../loading/BrowseLoadingText';

interface Props {
  onSelectCategory: (id: string) => void;
}


// Everything a section renderer might need, resolved once per render.
interface SectionCtx {
  dealsProducts: Product[];
  onSelectCategory: (id: string) => void;
}

// key -> how to render that section. `cfg` carries the admin title/subtitle
// overrides; `?? undefined` lets each component fall back to its own default
// copy when admin left the field blank. Returning null renders nothing.
const SECTION_REGISTRY: Record<string, (ctx: SectionCtx, cfg: HomeSectionConfig) => React.ReactNode> = {
  'quick-categories': (ctx, cfg) => <QuickCategoriesSection onSelectCategory={ctx.onSelectCategory} title={cfg.title ?? undefined} showTitle={false} />,
  'everyday-dairy': (_ctx, cfg) => <EverydayDairySection title={cfg.title ?? undefined} />,
  'nearby-stores': () => <NearbyStoresSection />,
  'trending': (_ctx, cfg) => <TrendingSection title={cfg.title ?? undefined} subtitle={cfg.subtitle} />,
  'most-bought': (_ctx, cfg) => <MostBoughtSection title={cfg.title ?? undefined} subtitle={cfg.subtitle} />,
  'category-sections': () => <CategorySections />,
  'deals-for-you': (ctx, cfg) => (
    <DealsForYouSection products={ctx.dealsProducts} title={cfg.title ?? undefined} subtitle={cfg.subtitle} />
  ),
  'top-rated-stores': (_ctx, cfg) => <TopRatedStoresSection title={cfg.title ?? undefined} subtitle={cfg.subtitle} />,
  'deals-section': () => <DealsSection />,
  'todays-best-deals': (ctx, cfg) =>
    ctx.dealsProducts.length > 0 ? (
      <ProductSection title={cfg.title ?? 'Today’s Best Deals'} products={ctx.dealsProducts} showDiscountBadge />
    ) : null,
  'price-drops': (ctx, cfg) => (
    <PriceDropsSection products={ctx.dealsProducts} title={cfg.title ?? undefined} subtitle={cfg.subtitle} />
  ),
  'everyday-essentials': (_ctx, cfg) => <EverydayEssentialsSection title={cfg.title ?? undefined} subtitle={cfg.subtitle} />,
  'new-on-gloceries': (_ctx, cfg) => <NewOnGloceriesSection title={cfg.title ?? undefined} subtitle={cfg.subtitle} />,
  'brand-footer': () => <BrandFooter />,
};

// Previous hardcoded order — used verbatim when the admin config is
// unavailable, so Home is never blank on a failed/empty fetch.
const FALLBACK_ORDER = [
  'quick-categories',
  'everyday-dairy',
  'nearby-stores',
  'trending',
  'most-bought',
  'category-sections',
  'deals-for-you',
  'top-rated-stores',
  'deals-section',
  'todays-best-deals',
  'price-drops',
  'everyday-essentials',
  'new-on-gloceries',
  'brand-footer',
];

export function AllTabSections({ onSelectCategory }: Props) {
  // Continue the exact final header colour rather than restarting its
  // gradient or maintaining a separate shortcut colour that can drift.
  const shortcutsBackground = useActiveHeaderGradient('all', false).bottomColor;
  const { storeId } = useNearestStore();
  const { data: dealsProducts = [] } = useDealsProducts(storeId);
  const { data: sectionConfig } = useHomeSections();
  const inventory = useNearbyGroceryInventory();

  const ctx: SectionCtx = {
    dealsProducts,
    onSelectCategory,
  };

  // Admin config when present (enabled only, ordered by sortIndex); otherwise
  // the fallback order, everything on, no overrides.
  const configuredSections: HomeSectionConfig[] =
    sectionConfig && sectionConfig.length > 0
      ? [...sectionConfig].filter((s) => s.enabled).sort((a, b) => a.sortIndex - b.sortIndex)
      : FALLBACK_ORDER.map((key, i) => ({ key, title: null, subtitle: null, enabled: true, sortIndex: i, bgColor: null }));

  // Keep daily dairy above shops, including older server configurations
  // that do not contain this new section. Honour an explicit disabled row.
  const dairyConfig = sectionConfig?.find((section) => section.key === 'everyday-dairy');
  const sections = configuredSections.filter((section) => section.key !== 'everyday-dairy' && section.key !== 'festival-greeting');
  if (dairyConfig?.enabled !== false) {
    const shopsIndex = sections.findIndex((section) => section.key === 'nearby-stores');
    const dairyIndex = Math.max(shopsIndex, 0);
    sections.splice(dairyIndex, 0, dairyConfig ?? {
      key: 'everyday-dairy', title: null, subtitle: null, enabled: true, sortIndex: dairyIndex, bgColor: null,
    });
  }

  // Add the new shortcuts for older server configs, honour an explicit
  // disabled row, and keep them first so the header colour stays continuous.
  const quickConfig = sectionConfig?.find((section) => section.key === 'quick-categories');
  const quickIndex = sections.findIndex((section) => section.key === 'quick-categories');
  if (quickIndex >= 0) sections.splice(quickIndex, 1);
  if (quickConfig?.enabled !== false) {
    sections.splice(0, 0, quickConfig ?? {
      key: 'quick-categories', title: null, subtitle: null, enabled: true, sortIndex: 0, bgColor: null,
    });
  }

  return (
    // pb-32 — floating-CartBar clearance, same as every tab body.
    <View className="pb-32">
      <View style={{ backgroundColor: shortcutsBackground }}>
        <HomeWelcomeBanner backgroundColor={shortcutsBackground} />
      </View>
      {sections.map((cfg) => {
        if (inventory.isLoading && cfg.key !== 'quick-categories') return null;
        const render = SECTION_REGISTRY[cfg.key];
        if (!render) return null; // config key with no code section yet
        const node = render(ctx, cfg);
        if (!node) return null; // section chose to render nothing (no data etc.)
        return (
          <View key={cfg.key} style={cfg.key === 'quick-categories' ? {
            backgroundColor: shortcutsBackground,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            overflow: 'hidden',
            paddingBottom: 24,
          } : cfg.bgColor ? { backgroundColor: cfg.bgColor } : undefined}>
            {node}
          </View>
        );
      })}
      {inventory.isLoading && <BrowseLoadingText />}
    </View>
  );
}
