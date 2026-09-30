// Home’s Groceries tab: discovery, local shops and address-scoped food collections.
import { View } from 'react-native';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import { BestSellersSection } from './best-sellers/BestSellersSection';
import { GROCERY_SUBCATEGORIES } from './data';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { GroceryPoster } from './poster/GroceryPoster';
import { GroceryOffersSection } from './grocery-offers/GroceryOffersSection';
import { ShopsYouKnowSection } from './shops-you-know/ShopsYouKnowSection';
import { KitchenEssentialsSection } from './kitchen-essentials/KitchenEssentialsSection';
import { BreakfastEssentialsSection } from './breakfast-essentials/BreakfastEssentialsSection';
import { SnacksAndDrinksSection } from './snacks-and-drinks/SnacksAndDrinksSection';
import { LocalBrandsSection } from './local-brands/LocalBrandsSection';
import { PicklesSaucesSpreadsSection } from './pickles-sauces-spreads/PicklesSaucesSpreadsSection';
import { BrandFooter } from '../../../components/BrandFooter';

export function GroceriesTab({ banner }: { banner?: RemoteHomeTabBanner }) {
  return (
    <View>
      <SubCategoryGrid items={GROCERY_SUBCATEGORIES} />
      <BestSellersSection />
      <GroceryPoster banner={banner} />
      <GroceryOffersSection />
      <ShopsYouKnowSection />
      <KitchenEssentialsSection />
      <BreakfastEssentialsSection />
      <SnacksAndDrinksSection />
      <LocalBrandsSection />
      <PicklesSaucesSpreadsSection />
      <BrandFooter />
    </View>
  );
}
