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

import { memo, useEffect, useMemo, useState } from 'react';
import { InteractionManager, View } from 'react-native';
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
import { SectionSkeleton } from '../loading/SectionSkeleton';
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

// Stable empty feed so a still-loading query doesn't hand assignDistinctRows a
// fresh [] every render (keeps the memoized rows identity steady).
const EMPTY_PRODUCTS: Product[] = [];

// Sections rendered eagerly on first paint; the rest mount one idle frame later
// (see the deferral note in AllTabSections). 6 above-the-fold entries plus the
// welcome banner reliably overflow a phone viewport, so the deferred tail is
// always off-screen when it mounts — no layout jump, no blank flash.
const ABOVE_FOLD_COUNT = 6;

// One section, memoized: React.memo skips the whole subtree (and never calls
// its registry renderer) when its props are referentially equal, so a single
// landing query no longer re-renders sections whose inputs didn't change.
const HomeSection = memo(function HomeSection({
  renderSection,
  ctx,
  copy,
  loading,
  bgColor,
  isQuickLeading,
  shortcutsBackground,
}: {
  renderSection: (ctx: SectionCtx, copy: SectionCopy) => React.ReactNode;
  ctx: SectionCtx;
  copy: SectionCopy;
  loading: boolean;
  bgColor: string | null;
  isQuickLeading: boolean;
  shortcutsBackground: string;
}) {
  const node = renderSection(ctx, copy);
  if (!node) {
    // Section rendered nothing. If its own feed is still loading, hold a
    // fixed-height skeleton so the layout doesn't jump when data lands; if it's
    // genuinely empty (loaded, no data), render nothing.
    return loading ? <View><SectionSkeleton /></View> : null;
  }
  return (
    <View style={isQuickLeading ? {
      backgroundColor: shortcutsBackground,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: 'hidden',
      paddingBottom: 24,
    } : bgColor ? { backgroundColor: bgColor } : undefined}>
      {node}
    </View>
  );
});

export function AllTabSections({ onSelectCategory }: Props) {
  // Continue the exact final header colour rather than restarting its
  // gradient or maintaining a separate shortcut colour that can drift.
  const shortcutsBackground = useActiveHeaderGradient('all', false).bottomColor;
  const dealsQuery = useDealsProducts();
  const trendingQuery = usePopularProducts(7);
  const mostBoughtQuery = usePopularProducts(30);
  const essentialsQuery = useEverydayEssentials();
  const { data: sectionConfig } = useHomeSections();
  const t = useCopyText();

  // Product rows, rebuilt only when a feed actually changes — not on every
  // re-render — so ctx.rows keeps a stable identity between query resolutions.
  const rows = useMemo(
    () => assignDistinctRows(ROW_PRIORITY, {
      'price-drops': { feed: dealsQuery.data ?? EMPTY_PRODUCTS, cap: 4 },
      'todays-best-deals': { feed: dealsQuery.data ?? EMPTY_PRODUCTS, cap: 6 },
      'deals-for-you': { feed: dealsQuery.data ?? EMPTY_PRODUCTS, cap: 8 },
      trending: { feed: trendingQuery.data ?? EMPTY_PRODUCTS, cap: 6 },
      'most-bought': { feed: mostBoughtQuery.data ?? EMPTY_PRODUCTS, cap: 6 },
      'everyday-essentials': { feed: essentialsQuery.data ?? EMPTY_PRODUCTS, cap: ESSENTIALS_GRID_LIMIT },
    }),
    [dealsQuery.data, trendingQuery.data, mostBoughtQuery.data, essentialsQuery.data],
  );

  // Admin config when present (enabled only, ordered by sortIndex); otherwise
  // the fallback order, everything on, no overrides. Memoized so an unrelated
  // query landing doesn't rebuild and re-sort the whole section list.
  const sections = useMemo<HomeSectionConfig[]>(() => {
    const configured: HomeSectionConfig[] =
      sectionConfig && sectionConfig.length > 0
        ? [...sectionConfig].filter((s) => s.enabled).sort((a, b) => a.sortIndex - b.sortIndex)
        : FALLBACK_ORDER.map((key, i) => ({ key, title: null, subtitle: null, enabled: true, sortIndex: i, bgColor: null }));
    // Quick categories and Everyday Dairy are ordinary admin rows (migration
    // 116): their enabled flag and order come from Home Sections. Only a server
    // that predates 116 (no row at all) gets them at their old default spots.
    const list = configured.filter((section) => section.key !== 'festival-greeting');
    if (sectionConfig && sectionConfig.length > 0) {
      if (!sectionConfig.some((section) => section.key === 'everyday-dairy')) {
        const shopsIndex = list.findIndex((section) => section.key === 'nearby-stores');
        list.splice(Math.max(shopsIndex, 0), 0, {
          key: 'everyday-dairy', title: null, subtitle: null, enabled: true, sortIndex: 0, bgColor: null,
        });
      }
      if (!sectionConfig.some((section) => section.key === 'quick-categories')) {
        list.unshift({ key: 'quick-categories', title: null, subtitle: null, enabled: true, sortIndex: 0, bgColor: null });
      }
    }
    return list;
  }, [sectionConfig]);

  const quickCategoriesLeading = sections[0]?.key === 'quick-categories';

  // Everything a section renderer needs, with a stable identity so React.memo
  // on HomeSection can bail out when a section's inputs are unchanged.
  const ctx = useMemo<SectionCtx>(
    () => ({ rows, onSelectCategory, quickCategoriesLeading }),
    [rows, onSelectCategory, quickCategoriesLeading],
  );

  // Section copy, resolved once per section and memoized so copy strings keep a
  // stable identity across re-renders (title/subtitle override, then app copy).
  const copyByKey = useMemo<Record<string, SectionCopy>>(() => {
    const map: Record<string, SectionCopy> = {};
    for (const cfg of sections) {
      map[cfg.key] = {
        title: cfg.title?.trim() || t(`${copyPrefix(cfg.key)}.title`),
        subtitle: cfg.subtitle?.trim() || t(`${copyPrefix(cfg.key)}.subtitle`) || null,
      };
    }
    return map;
  }, [sections, t]);

  // Per-section loading: a section whose product feed is still loading shows a
  // SectionSkeleton (stable layout) instead of null. Only the feed-driven rows
  // are listed; every other section owns its own query and paints on its own.
  const loadingByKey = useMemo<Partial<Record<string, boolean>>>(() => ({
    'price-drops': dealsQuery.isPending,
    'todays-best-deals': dealsQuery.isPending,
    'deals-for-you': dealsQuery.isPending,
    trending: trendingQuery.isPending,
    'most-bought': mostBoughtQuery.isPending,
    'everyday-essentials': essentialsQuery.isPending,
  }), [dealsQuery.isPending, trendingQuery.isPending, mostBoughtQuery.isPending, essentialsQuery.isPending]);

  // One memoized node per section, kept in a stable array so a re-render that
  // doesn't change a given section's inputs reuses its element (React skips the
  // subtree and never re-runs that section's registry renderer).
  const children = useMemo(
    () => sections.map((cfg) => {
      const render = SECTION_REGISTRY[cfg.key];
      if (!render) return null; // config key with no code section yet
      return (
        <HomeSection
          key={cfg.key}
          renderSection={render}
          ctx={ctx}
          copy={copyByKey[cfg.key]}
          loading={!!loadingByKey[cfg.key]}
          bgColor={cfg.bgColor}
          isQuickLeading={cfg.key === 'quick-categories' && quickCategoriesLeading}
          shortcutsBackground={shortcutsBackground}
        />
      );
    }),
    [sections, ctx, copyByKey, loadingByKey, quickCategoriesLeading, shortcutsBackground],
  );
  // First paint mounts only the above-the-fold set; the rest (and their own
  // queries) mount one idle frame later via runAfterInteractions. The deferred
  // tail sits below the fold at scroll 0, so this cuts first-paint fan-out
  // with no layout jump, blank flash, or change to section order/data.
  const [deferredMounted, setDeferredMounted] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setDeferredMounted(true));
    return () => handle.cancel();
  }, []);
  const visibleChildren = deferredMounted ? children : children.slice(0, ABOVE_FOLD_COUNT);

  return (
    // pb-32 — floating-CartBar clearance, same as every tab body.
    <View className="pb-32">
      {/* marginBottom pulls the next section up to trim the empty space under
          the welcome banner image (same bg, so it just tightens the gap). */}
      <View style={{ backgroundColor: shortcutsBackground, marginBottom: -8 }}>
        <HomeWelcomeBanner backgroundColor={shortcutsBackground} />
      </View>
      {visibleChildren}
    </View>
  );
}
