// Everything shown when the "Protein" category tab is selected on Home.
// Building blocks come from ../category-tab/. Poster is real admin data
// (Home Categories -> "Protein" tab's own "Ads & posters" section), image
// only — no hardcoded dummy copy/photo anymore; the section renders only
// when a founder has actually added one.
//
// SubCategoryGrid's title is omitted (unset, not an empty string) — same
// pattern GroceriesTab.tsx uses for its own grid, per an explicit ask to
// drop the heading here too.
//
// The "Everyday protein" product row (PROTEIN_PRODUCTS) is gone — per an
// explicit ask to strip every product-card dummy dataset out of the app.
// No real Protein-scoped catalog feed exists yet; re-add once one does,
// not with fabricated data in the meantime.

import { View } from 'react-native';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { SubCategoryGrid } from '../category-tab/components/SubCategoryGrid';
import type { RemoteHomeTabBanner } from '../data/useHomeTabs';
import { PROTEIN_SUBCATEGORIES } from './data';

interface Props {
  banner?: RemoteHomeTabBanner;
}

export function ProteinTab({ banner }: Props) {
  return (
    <View className="pb-32">
      <SubCategoryGrid items={PROTEIN_SUBCATEGORIES} />
      {banner && <PosterBanner imageUri={banner.imageUrl} />}
    </View>
  );
}
