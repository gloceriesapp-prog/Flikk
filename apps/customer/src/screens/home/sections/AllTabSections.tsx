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
import { ESSENTIALS_GRID_LIMIT, EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { useEverydayEssentials } from '../everyday-essentials/useEverydayEssentials';
import { usePopularProducts } from '../trending/useTrendingThisWeek';
import { useCopyText } from '../../../api/appConfig';
import { assignDistinctRows } from './distinctRows';
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
import { useDealsProducts } from './useDealsProducts';
import { useHomeSections, type HomeSectionConfig } from '../useHomeSections';
import type { Product } from '../products/types';
import { useNearbyGroceryInventory } from '../groceries/useNearbyGroceryInventory';
import { BrowseLoadingText } from '../loading/BrowseLoadingText';
import { FestivalPicksSection } from '../festival/picks/FestivalPicksSection';
import { SeasonalSection } from '../seasonal/SeasonalSection';

interface Props {
  onSelectCategory: (id: string) => void;
}


// Everything a section renderer might need, resolved once per render.
interface SectionCtx {
  rows: Record<ProductRowKey, Product[]>;
  onSelectCategory: (id: string) => void;
  // Quick categories directly under the header continue its colour, untitled.
  quickCategoriesLeading: boolean;
}

// Product rows that share feeds. Claimed in this priority (biggest discounts
// and freshest momentum first) so no product repeats across rows and a row
// that would only duplicate another is hidden — see distinctRows.ts.
type ProductRowKey = 'price-drops' | 'todays-best-deals' | 'deals-for-you' | 'trending' | 'most-bought' | 'everyday-essentials';
const ROW_PRIORITY: ProductRowKey[] = ['price-drops', 'todays-best-deals', 'deals-for-you', 'trending', 'most-bought', 'everyday-essentials'];

// Section copy: Home Sections title/subtitle override (admin) wins, then the
// app_content copy key home.<camelKey>.title|subtitle (registry default in
// packages/home-content/copyKeys.js, editable on admin's App content page).
interface SectionCopy { title: string; subtitle: string | null }
const copyPrefix = (key: string) => `home.${key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`;

// key -> how to render that section. Returning null renders nothing.
const SECTION_REGISTRY: Record<string, (ctx: SectionCtx, copy: SectionCopy) => React.ReactNode> = {
  'quick-categories': (ctx, c) => <QuickCategoriesSection onSelectCategory={ctx.onSelectCategory} title={c.title} showTitle={!ctx.quickCategoriesLeading} />,
  'everyday-dairy': (_ctx, c) => <EverydayDairySection title={c.title} />,
  // Admin Festival Section / Seasonal Section; each renders nothing while
  // inactive or empty (FestivalPicksSection.tsx, SeasonalSection.tsx).
  'festival-picks': (_ctx, c) => <FestivalPicksSection title={c.title} />,
  'seasonal': (_ctx, c) => <SeasonalSection title={c.title} subtitle={c.subtitle} />,
  'nearby-stores': () => <NearbyStoresSection />,
  'trending': (ctx, c) => <TrendingSection title={c.title} subtitle={c.subtitle} products={ctx.rows.trending} />,
  'most-bought': (ctx, c) => <MostBoughtSection title={c.title} subtitle={c.subtitle} products={ctx.rows['most-bought']} />,
  'category-sections': () => <CategorySections />,
  'deals-for-you': (ctx, c) => <DealsForYouSection products={ctx.rows['deals-for-you']} title={c.title} subtitle={c.subtitle} />,
  'top-rated-stores': (_ctx, c) => <TopRatedStoresSection title={c.title} subtitle={c.subtitle} />,
  'deals-section': () => <DealsSection />,
  'todays-best-deals': (ctx, c) =>
    ctx.rows['todays-best-deals'].length > 0 ? (
      <ProductSection title={c.title} products={ctx.rows['todays-best-deals']} showDiscountBadge />
    ) : null,
  'price-drops': (ctx, c) => <PriceDropsSection products={ctx.rows['price-drops']} title={c.title} subtitle={c.subtitle} />,
  'everyday-essentials': (ctx, c) => <EverydayEssentialsSection title={c.title} subtitle={c.subtitle} products={ctx.rows['everyday-essentials']} />,
  'new-on-gloceries': (_ctx, c) => <NewOnGloceriesSection title={c.title} subtitle={c.subtitle} />,
  'brand-footer': () => <BrandFooter />,
};

// Previous hardcoded order — used verbatim when the admin config is
// unavailable, so Home is never blank on a failed/empty fetch.
const FALLBACK_ORDER = [
  'quick-categories',
  'everyday-dairy',
  'festival-picks',
  'nearby-stores',
  'seasonal',
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
  const { data: dealsProducts = [] } = useDealsProducts();
  const { data: trending = [] } = usePopularProducts(7);
  const { data: mostBought = [] } = usePopularProducts(30);
  const { data: essentials = [] } = useEverydayEssentials();
  const { data: sectionConfig } = useHomeSections();
  const inventory = useNearbyGroceryInventory();
  const t = useCopyText();

  const ctx: SectionCtx = {
    rows: assignDistinctRows(ROW_PRIORITY, {
      'price-drops': { feed: dealsProducts, cap: 4 },
      'todays-best-deals': { feed: dealsProducts, cap: 6 },
      'deals-for-you': { feed: dealsProducts, cap: 8 },
      trending: { feed: trending, cap: 6 },
      'most-bought': { feed: mostBought, cap: 6 },
      'everyday-essentials': { feed: essentials, cap: ESSENTIALS_GRID_LIMIT },
    }),
    onSelectCategory,
    quickCategoriesLeading: false,
  };
  const sectionCopy = (cfg: HomeSectionConfig): SectionCopy => ({
    title: cfg.title?.trim() || t(`${copyPrefix(cfg.key)}.title`),
    subtitle: cfg.subtitle?.trim() || t(`${copyPrefix(cfg.key)}.subtitle`) || null,
  });

  // Admin config when present (enabled only, ordered by sortIndex); otherwise
  // the fallback order, everything on, no overrides.
  const configuredSections: HomeSectionConfig[] =
    sectionConfig && sectionConfig.length > 0
      ? [...sectionConfig].filter((s) => s.enabled).sort((a, b) => a.sortIndex - b.sortIndex)
      : FALLBACK_ORDER.map((key, i) => ({ key, title: null, subtitle: null, enabled: true, sortIndex: i, bgColor: null }));

  // Quick categories and Everyday Dairy are ordinary admin rows (migration
  // 116): their enabled flag and order come from Home Sections. Only a server
  // that predates 116 (no row at all) gets them at their old default spots.
  const sections = configuredSections.filter((section) => section.key !== 'festival-greeting');
  if (sectionConfig && sectionConfig.length > 0) {
    if (!sectionConfig.some((section) => section.key === 'everyday-dairy')) {
      const shopsIndex = sections.findIndex((section) => section.key === 'nearby-stores');
      sections.splice(Math.max(shopsIndex, 0), 0, {
        key: 'everyday-dairy', title: null, subtitle: null, enabled: true, sortIndex: 0, bgColor: null,
      });
    }
    if (!sectionConfig.some((section) => section.key === 'quick-categories')) {
      sections.unshift({ key: 'quick-categories', title: null, subtitle: null, enabled: true, sortIndex: 0, bgColor: null });
    }
  }

  ctx.quickCategoriesLeading = sections[0]?.key === 'quick-categories';

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
        const node = render(ctx, sectionCopy(cfg));
        if (!node) return null; // section chose to render nothing (no data etc.)
        return (
          <View key={cfg.key} style={cfg.key === 'quick-categories' && ctx.quickCategoriesLeading ? {
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
