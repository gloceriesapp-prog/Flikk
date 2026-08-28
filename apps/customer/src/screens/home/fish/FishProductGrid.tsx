// Wrapper over the shared ProductSection (see ../products/) pairing the
// Fresh Fish catalog with its section title, plus this tab's own promo
// poster — real admin data (Home Categories -> "Meat & Fish" tab's own
// "Ads & posters" section), image only, renders only when a founder has
// actually added one, same convention as GroceriesTab/BakeryTab/ProteinTab.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { ProductSection } from '../products/ProductSection';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { FISH_PRODUCTS } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function FishProductGrid({ banner }: Props) {
  return (
    <View>
      {banner && <PosterBanner imageUri={banner.imageUrl} />}
      <ProductSection title="Fresh meat and fish, every day." products={FISH_PRODUCTS} />
    </View>
  );
}
