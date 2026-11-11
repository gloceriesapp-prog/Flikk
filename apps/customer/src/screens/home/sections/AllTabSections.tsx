// Home All tab renders sections in the order configured in Admin.

import { memo, useMemo, type ReactElement } from 'react';
import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { BrandFooter } from '../../../components/BrandFooter';
import { DealsSection } from '../deals/DealsSection';
import { PriceDropsSection } from '../deals/PriceDropsSection';
import { DealsForYouSection } from '../deals/DealsForYouSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { useEverydayEssentials } from '../everyday-essentials/useEverydayEssentials';
import { usePopularProducts } from '../trending/useTrendingThisWeek';
import { useCopyText } from '../../../api/appConfig';
import { assignHomeRows } from './distinctRows';
import { resolveAllTabSections } from './allTabLayout';
import { useHomePicks } from './useHomePicks';
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
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { HomeSectionBanner } from '../components/HomeSectionBanner';
import { PreorderSection } from '../preorders/PreorderSection';
import { homePreviewLimit, homeProductLayout, supportsHomeBanner, type HomeProductLayout } from '../../../../../../packages/home-content/sectionLayout.js';

export interface HomeSectionItem {
  key: string;
  node: ReactElement;
}

// Everything a section renderer might need, resolved once per render.
interface SectionCtx {
  rows: Record<ProductRowKey, Product[]>;
  collections: Record<ProductRowKey, Product[]>;
  // Hand-picked products for founder-made sections (custom-xxxxxx keys).
  picks: Record<string, Product[]>;
  onSelectCategory: (id: string) => void;
  // Quick categories directly under the header continue its colour, untitled.
  quickCategoriesLeading: boolean;
}

// Product rows that share feeds. Claimed in this priority (biggest discounts
// and freshest momentum first) so no product repeats across rows and a row
// that would only duplicate another is hidden — see distinctRows.ts.
type ProductRowKey = 'price-drops' | 'todays-best-deals' | 'deals-for-you' | 'trending' | 'most-bought' | 'everyday-essentials';
const ROW_PRIORITY: ProductRowKey[] = ['price-drops', 'todays-best-deals', 'deals-for-you', 'trending', 'most-bought', 'everyday-essentials'];
const COLLECTION_LABELS: Partial<Record<string, string>> = {
  'price-drops': 'See all price drops',
  'todays-best-deals': 'See today’s best deals',
  trending: 'See all popular products',
  'most-bought': 'See all bestsellers',
  'everyday-essentials': 'See all essentials',
};


// Section copy: Home Sections title/subtitle override (admin) wins, then the
// app_content copy key home.<camelKey>.title|subtitle (registry default in
// packages/home-content/copyKeys.js, editable on admin's App content page).
interface SectionCopy { title: string; subtitle: string | null }
type RenderSection = (ctx: SectionCtx, copy: SectionCopy, config: HomeSectionConfig) => React.ReactNode;

function layoutFor(config: HomeSectionConfig): HomeProductLayout {
  return homeProductLayout(config.key, config.displayLayout) ?? 'grid';
}
const copyPrefix = (key: string) => `home.${key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}`;

const renderCustomSection: RenderSection = (ctx, copy, config) => {
  const products = (ctx.picks[config.key] ?? []).filter((product) => product.isAvailable !== false);
  if (!products.length) return null;
  const layout = layoutFor(config);
  const preview = products.slice(0, homePreviewLimit(layout));
  return (
    <>
      <ProductSection title={copy.title} subtitle={copy.subtitle} products={preview} layout={layout} />
      <HomeProductCollectionButton label={`See all ${copy.title}`} title={copy.title} products={products} preview={preview} />
    </>
  );
};

// key -> how to render that section. Returning null renders nothing.
const SECTION_REGISTRY: Record<string, RenderSection> = {
  'quick-categories': (ctx, c) => <QuickCategoriesSection onSelectCategory={ctx.onSelectCategory} title={c.title} showTitle={!ctx.quickCategoriesLeading} />,
  'everyday-dairy': (ctx, c, cfg) => (
    <EverydayDairySection title={c.title} subtitle={c.subtitle} products={ctx.picks[cfg.key] ?? EMPTY_PRODUCTS}
      layout={layoutFor(cfg)} pinnedOnly={cfg.pinnedOnly === true} />
  ),
  // Admin Festival Section / Seasonal Section; each renders nothing while
  // inactive or empty (FestivalPicksSection.tsx, SeasonalSection.tsx).
  'festival-picks': (_ctx, c) => <FestivalPicksSection title={c.title} />,
  'seasonal': (_ctx, c) => <SeasonalSection title={c.title} subtitle={c.subtitle} />,
  'nearby-stores': () => <NearbyStoresSection />,
  // Pre-order only products (admin "Pre-order only"); nowhere else on Home.
  'preorders': (_ctx, c, cfg) => <PreorderSection title={c.title} bannerImageUrl={cfg.bannerImageUrl} />,
  'trending': (ctx, c, cfg) => <TrendingSection title={c.title} subtitle={c.subtitle} products={ctx.rows.trending} layout={layoutFor(cfg)} />,
  'most-bought': (ctx, c, cfg) => <MostBoughtSection title={c.title} subtitle={c.subtitle} products={ctx.rows['most-bought']} layout={layoutFor(cfg)} />,
  'category-sections': () => <CategorySections homeOnly />,
  'deals-for-you': (ctx, c, cfg) => (
    <DealsForYouSection products={ctx.rows['deals-for-you']} collectionProducts={ctx.collections['deals-for-you']}
      title={c.title} subtitle={c.subtitle} layout={layoutFor(cfg)} />
  ),
  'top-rated-stores': (_ctx, c) => <TopRatedStoresSection title={c.title} subtitle={c.subtitle} />,
  'deals-section': () => <DealsSection />,
  'todays-best-deals': (ctx, c, cfg) => (
    <ProductSection title={c.title} subtitle={c.subtitle} products={ctx.rows['todays-best-deals']} layout={layoutFor(cfg)} showDiscountBadge />
  ),
  'price-drops': (ctx, c) => <PriceDropsSection products={ctx.rows['price-drops']} title={c.title} subtitle={c.subtitle} />,
  'everyday-essentials': (ctx, c, cfg) => <EverydayEssentialsSection title={c.title} subtitle={c.subtitle} products={ctx.rows['everyday-essentials']} layout={layoutFor(cfg)} />,
  'new-on-gloceries': (_ctx, c) => <NewOnGloceriesSection title={c.title} subtitle={c.subtitle} />,
  'brand-footer': () => <BrandFooter />,
};

// Stable empty feed so a still-loading query doesn't hand assignHomeRows a
// fresh [] every render (keeps the memoized rows identity steady).
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_PICKS: Record<string, Product[]> = {};

// Items rendered on first paint (HomeScreen's initialNumToRender): the welcome
// banner plus 6 sections reliably overflow a phone viewport, so the rest mount
// off-screen as the list fills in — no layout jump, no blank flash.
export const ABOVE_FOLD_ITEM_COUNT = 7;

// One section, memoized: React.memo skips the whole subtree (and never calls
// its registry renderer) when its props are referentially equal, so a single
// landing query no longer re-renders sections whose inputs didn't change.
const HomeSection = memo(function HomeSection({
  renderSection,
  config,
  ctx,
  copy,
  loading,
  bgColor,
  isQuickLeading,
  shortcutsBackground,
}: {
  renderSection: RenderSection;
  config: HomeSectionConfig;
  ctx: SectionCtx;
  copy: SectionCopy;
  loading: boolean;
  bgColor: string | null;
  isQuickLeading: boolean;
  shortcutsBackground: string;
}) {
  const sectionKey = config.key;
  const node = renderSection(ctx, copy, config);
  const collectionLabel = COLLECTION_LABELS[sectionKey];
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
      {sectionKey !== 'preorders' && supportsHomeBanner(sectionKey) && (
        <HomeSectionBanner imageUrl={config.bannerImageUrl} title={copy.title} />
      )}
      {node}
      {collectionLabel && (
        <HomeProductCollectionButton
          label={collectionLabel}
          title={copy.title}
          products={ctx.collections[sectionKey as ProductRowKey]}
          preview={ctx.rows[sectionKey as ProductRowKey]}
          showDiscountBadge
        />
      )}
    </View>
  );
});

export function useAllTabSectionItems(onSelectCategory: (id: string) => void): HomeSectionItem[] {
  // Continue the exact final header colour rather than restarting its
  // gradient or maintaining a separate shortcut colour that can drift.
  const shortcutsBackground = useActiveHeaderGradient('all', false).bottomColor;
  const dealsQuery = useDealsProducts();
  const trendingQuery = usePopularProducts(7);
  const mostBoughtQuery = usePopularProducts(30);
  const essentialsQuery = useEverydayEssentials();
  const picksQuery = useHomePicks();
  const { data: sectionConfig } = useHomeSections();
  const picks = picksQuery.data ?? EMPTY_PICKS;
  const t = useCopyText();

  const sections = useMemo(() => resolveAllTabSections(sectionConfig), [sectionConfig]);

  // Only visible sections can claim products from a shared feed.
  const { rows, collections } = useMemo(() => {
    const configured = new Map(sections.map((section) => [section.key, section]));
    const priority = ROW_PRIORITY.filter((key) => configured.has(key));
    const pinnedOnly = new Set(sections.filter((section) => section.pinnedOnly).map((section) => section.key));
    const feeds: Record<ProductRowKey, Product[]> = {
      'price-drops': dealsQuery.data ?? EMPTY_PRODUCTS,
      'todays-best-deals': dealsQuery.data ?? EMPTY_PRODUCTS,
      'deals-for-you': dealsQuery.data ?? EMPTY_PRODUCTS,
      trending: trendingQuery.data ?? EMPTY_PRODUCTS,
      'most-bought': mostBoughtQuery.data ?? EMPTY_PRODUCTS,
      'everyday-essentials': essentialsQuery.data ?? EMPTY_PRODUCTS,
    };
    const inputs = {} as Record<ProductRowKey, { feed: Product[]; cap: number }>;
    const collections = {} as Record<ProductRowKey, Product[]>;
    for (const key of priority) {
      const config = configured.get(key)!;
      const cap = key === 'price-drops' ? 4 : homePreviewLimit(layoutFor(config));
      const feed = feeds[key];
      const availablePicks = (picks[key] ?? []).filter((product) => product.isAvailable !== false);
      inputs[key] = { feed, cap };
      collections[key] = pinnedOnly.has(key) ? availablePicks : [...availablePicks, ...feed];
    }
    return { rows: assignHomeRows(priority, inputs, picks, pinnedOnly), collections };
  }, [sections, dealsQuery.data, trendingQuery.data, mostBoughtQuery.data, essentialsQuery.data, picks]);

  const quickCategoriesLeading = sections[0]?.key === 'quick-categories';

  // Everything a section renderer needs, with a stable identity so React.memo
  // on HomeSection can bail out when a section's inputs are unchanged.
  const ctx = useMemo<SectionCtx>(
    () => ({ rows, collections, picks, onSelectCategory, quickCategoriesLeading }),
    [rows, collections, picks, onSelectCategory, quickCategoriesLeading],
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
  return useMemo(() => {
    const items: HomeSectionItem[] = [{
      key: 'welcome-banner',
      // marginBottom pulls the next section up to trim the empty space under
      // the welcome banner image (same bg, so it just tightens the gap).
      node: (
        <View style={{ backgroundColor: shortcutsBackground, marginBottom: -8 }}>
          <HomeWelcomeBanner backgroundColor={shortcutsBackground} />
        </View>
      ),
    }];
    for (const cfg of sections) {
      const render = cfg.custom ? renderCustomSection : SECTION_REGISTRY[cfg.key];
      if (!render) continue; // config key with no code section yet
      items.push({
        key: cfg.key,
        node: (
          <HomeSection
            renderSection={render}
            config={cfg}
            ctx={ctx}
            copy={copyByKey[cfg.key]}
            loading={cfg.custom ? picksQuery.isPending : !!loadingByKey[cfg.key]}
            bgColor={cfg.bgColor}
            isQuickLeading={cfg.key === 'quick-categories' && quickCategoriesLeading}
            shortcutsBackground={shortcutsBackground}
          />
        ),
      });
    }
    return items;
  }, [sections, ctx, copyByKey, loadingByKey, picksQuery.isPending, quickCategoriesLeading, shortcutsBackground]);
}
