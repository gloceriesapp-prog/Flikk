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
// Festival greeting keeps its OWN admin control (festival_greeting table via
// useFestivalGreeting) for its copy/categories; home_sections only controls its
// order / on-off / bg for the 'festival-greeting' key (its isActive flag still
// gates it too, ANDed with the home_sections enabled flag).

import { View } from 'react-native';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { BrandFooter } from '../../../components/BrandFooter';
import { DealsSection } from '../deals/DealsSection';
import { PriceDropsSection } from '../deals/PriceDropsSection';
import { DealsForYouSection } from '../deals/DealsForYouSection';
import { EverydayEssentialsSection } from '../everyday-essentials/EverydayEssentialsSection';
import { FestivalGreetingSection } from '../festival-greeting/FestivalGreetingSection';
import { FestivalScallopEdge } from '../festival-greeting/FestivalScallopEdge';
import { MostBoughtSection } from '../most-bought/MostBoughtSection';
import { NearbyStoresSection } from '../nearby-stores/NearbyStoresSection';
import { NewOnGloceriesSection } from '../new-on-gloceries/NewOnGloceriesSection';
import { ProductSection } from '../products/ProductSection';
import { TopRatedStoresSection } from '../top-rated-stores/TopRatedStoresSection';
import { TrendingSection } from '../trending/TrendingSection';
import { useNearestStore } from '../useNearestStore';
import { useActiveHeaderGradient } from '../data/useActiveHeaderGradient';
import { useFestivalProducts } from '../festival-greeting/useFestivalProducts';
import { useFestivalGreeting } from '../festival-greeting/useFestivalGreeting';
import { useDealsProducts } from './useDealsProducts';
import { useHomeSections, type HomeSectionConfig } from '../useHomeSections';
import type { Product } from '../products/types';

interface Props {
  onSelectCategory: (id: string) => void;
}

// Everything a section renderer might need, resolved once per render.
interface SectionCtx {
  dealsProducts: Product[];
  festivalProducts: Product[];
  festivalGreeting: ReturnType<typeof useFestivalGreeting>['data'];
  headerBottomColor: string;
  onSelectCategory: (id: string) => void;
}

// key -> how to render that section. `cfg` carries the admin title/subtitle
// overrides; `?? undefined` lets each component fall back to its own default
// copy when admin left the field blank. Returning null renders nothing.
const SECTION_REGISTRY: Record<string, (ctx: SectionCtx, cfg: HomeSectionConfig) => React.ReactNode> = {
  'festival-greeting': (ctx) =>
    ctx.festivalGreeting?.isActive !== false ? (
      <View style={{ marginTop: -2, backgroundColor: ctx.headerBottomColor }}>
        <FestivalGreetingSection
          products={ctx.festivalProducts}
          title={ctx.festivalGreeting?.title}
          tagline={ctx.festivalGreeting?.tagline}
          categories={ctx.festivalGreeting?.categories}
        />
        <FestivalScallopEdge color={ctx.headerBottomColor} />
      </View>
    ) : null,
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
  'festival-greeting',
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
  const { storeId } = useNearestStore();
  const { data: dealsProducts = [] } = useDealsProducts(storeId);
  const { data: festivalProducts = [] } = useFestivalProducts();
  const { data: festivalGreeting } = useFestivalGreeting();
  const { data: sectionConfig } = useHomeSections();
  const headerGradient = useActiveHeaderGradient('all', false);

  const ctx: SectionCtx = {
    dealsProducts,
    festivalProducts,
    festivalGreeting,
    headerBottomColor: headerGradient.bottomColor,
    onSelectCategory,
  };

  // Admin config when present (enabled only, ordered by sortIndex); otherwise
  // the fallback order, everything on, no overrides.
  const sections: HomeSectionConfig[] =
    sectionConfig && sectionConfig.length > 0
      ? [...sectionConfig].filter((s) => s.enabled).sort((a, b) => a.sortIndex - b.sortIndex)
      : FALLBACK_ORDER.map((key, i) => ({ key, title: null, subtitle: null, enabled: true, sortIndex: i, bgColor: null }));

  return (
    // pb-32 — floating-CartBar clearance, same as every tab body.
    <View className="pb-32">
      {sections.map((cfg) => {
        const render = SECTION_REGISTRY[cfg.key];
        if (!render) return null; // config key with no code section yet
        const node = render(ctx, cfg);
        if (!node) return null; // section chose to render nothing (no data etc.)
        return (
          <View key={cfg.key} style={cfg.bgColor ? { backgroundColor: cfg.bgColor } : undefined}>
            {node}
          </View>
        );
      })}
    </View>
  );
}
