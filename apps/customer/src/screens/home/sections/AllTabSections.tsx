// Everything shown on the "All" category tab, below the header: the deals
// promo card, then Today's Deal, then Bestsellers. Only rendered when "all"
// is selected — see HomeScreen.tsx.

import { View } from 'react-native';
import { DealsSection } from '../deals/DealsSection';
import { ProductSection } from '../products/ProductSection';
import { BESTSELLER_PRODUCTS, TODAYS_DEAL_PRODUCTS } from './data';

export function AllTabSections() {
  return (
    <View>
      <DealsSection />
      <ProductSection title="Today's Deal" products={TODAYS_DEAL_PRODUCTS} />
      <ProductSection title="Bestsellers" products={BESTSELLER_PRODUCTS} />
    </View>
  );
}
